// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rand_distr::{Distribution, Normal};
use std::{borrow::BorrowMut, collections::HashMap, ops::Add, sync::Mutex};

use serde::{Deserialize, Serialize};
use smashquiz::GameManager;
use tauri::{Manager as _, State};

pub mod smashquiz;

#[derive(Serialize, Deserialize, Clone, Default)]
struct TeamState {
    /// The name of the team
    pub name: String,
    /// The damage the team has taken
    pub damage: f64,
    /// The number of teams that the team has smashed up
    pub up: usize,
    /// The number of teams that the team has been smashed down by
    pub down: usize,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Rule {
    /// ダメージ攻撃が成功した場合のダメージ
    pub damage_if_correct: Damage,
    /// ダメージ/スマッシュ攻撃が失敗した場合の反動ダメージ
    pub damage_if_incorrect: Damage,
    /// ストック制がある場合のルール
    pub stock: Option<StockRule>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Damage {
    /// 平均
    pub mean: f64,
    /// バラつきの標準偏差
    pub std_dev: f64,
}

impl Add<f64> for &Damage {
    type Output = f64;

    fn add(self, rhs: f64) -> Self::Output {
        let mut distr = Normal::new(self.mean, self.std_dev)
            .unwrap()
            .sample(&mut rand::thread_rng());
        if distr > self.mean {
            distr = self.mean;
        } else if distr < 0.0 {
            distr = 0.0;
        }
        distr + rhs
    }
}

/// ストック制のルール
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StockRule {
    /// ストック数
    pub count: usize,
    /// ストックを奪えるかどうか
    pub can_steal: bool,
}

impl Default for Rule {
    fn default() -> Self {
        Rule {
            damage_if_correct: Damage {
                mean: 0.1,
                std_dev: 0.05,
            },
            damage_if_incorrect: Damage {
                mean: 0.2,
                std_dev: 0.1,
            },
            stock: None,
        }
    }
}

impl smashquiz::Rule<TeamState> for Rule {
    fn new_state(&self, name: &str) -> TeamState {
        TeamState {
            name: name.to_string(),
            damage: 0.0,
            up: 0,
            down: 0,
        }
    }

    fn damage_if_correct(&self, attacked: &mut HashMap<String, TeamState>) {
        for team in attacked.values_mut() {
            team.damage = &self.damage_if_correct + team.damage;
        }
    }

    fn damage_if_incorrect(&self, attacker: &mut TeamState) {
        attacker.damage = &self.damage_if_incorrect + attacker.damage;
    }

    fn do_smash(&self, attacker: &mut TeamState, attacked: &mut HashMap<String, TeamState>) {
        attacker.up += attacked.len();
        for team in attacked.values_mut() {
            team.down += 1;
            team.damage = 0.0;
        }
    }

    fn judge_smash_success(&self, _: &TeamState, attacked: &TeamState) -> bool {
        rand::random::<f64>() < attacked.damage
    }

    fn team_is_active(&self, attacker: &TeamState) -> bool {
        if let Some(StockRule {
            count: stock,
            can_steal,
        }) = self.stock
        {
            if can_steal {
                stock - attacker.down + attacker.up > 0
            } else {
                stock - attacker.down > 0
            }
        } else {
            true
        }
    }
}

/// 参加者の行動の種類
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
enum Actor {
    /// スマッシュ攻撃を行う
    Smash,
    /// ダメージを与える
    Damage,
}

/// 生じたイベントの種類
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
enum Event {
    /// 初期化(ゲームの開始)
    Initialize(Rule),
    /// 強制的にViewを同期する
    Sync(Rule),
    /// 解答
    Answer { actor_type: Actor, success: bool },
}

/// ウィンドウ間でやり取りするメッセージ
#[derive(Serialize, Deserialize, Clone)]
struct Message {
    /// ゲームの状態
    update: HashMap<String, TeamState>,
    /// イベント
    event: Event,
}

macro_rules! ok {
    ($app_handle:expr, $e:expr) => {{
        $app_handle
            .emit_all("message", $e.clone())
            .or(Err("Failed to send message".to_string()))?;
        Ok($e)
    }};
}

#[derive(Serialize, Deserialize, Clone)]
struct LogRecord {
    /// ゲームの状態
    states: HashMap<String, TeamState>,
    /// このログが記録された時点でのカーソル位置
    before: usize,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Log {
    /// ゲームのルール
    rule: Rule,
    /// ゲームの状態の履歴
    records: Vec<LogRecord>,
    /// 現在のカーソル位置
    cursor: usize,
}

impl Log {
    fn new(manager: &GameManager<TeamState, Rule>) -> Log {
        Log {
            rule: manager.rule.clone(),
            records: vec![LogRecord {
                states: manager.teams.clone(),
                before: 0,
            }],
            cursor: 0,
        }
    }

    fn commit(&mut self, manager: &GameManager<TeamState, Rule>) {
        self.records.push(LogRecord {
            states: manager.teams.clone(),
            before: self.cursor,
        });
        self.cursor = self.records.len() - 1;
    }
    fn get_manager(&self) -> GameManager<TeamState, Rule> {
        GameManager {
            teams: self.records[self.cursor].states.clone(),
            rule: self.rule.clone(),
        }
    }
    fn undo(&mut self) -> Option<GameManager<TeamState, Rule>> {
        self.goto(self.records[self.cursor].before)
    }
    fn goto(&mut self, index: usize) -> Option<GameManager<TeamState, Rule>> {
        if index >= self.records.len() {
            return None;
        }
        self.cursor = index;
        Some(self.get_manager())
    }
    fn redo_list(&self) -> impl IntoIterator<Item = usize> + '_ {
        self.records
            .iter()
            .enumerate()
            .filter_map(|(index, record)| {
                if record.before == self.cursor {
                    Some(index)
                } else {
                    None
                }
            })
    }
    fn redo(&mut self) -> Option<GameManager<TeamState, Rule>> {
        self.goto(self.redo_list().into_iter().max()?)
    }
}

/// 強制的に同期する
#[tauri::command]
fn sync(
    manager: State<'_, Mutex<Option<GameManager<TeamState, Rule>>>>,
    app_handle: tauri::AppHandle,
) -> Result<Message, String> {
    let manager = manager.lock().unwrap();
    let manager = manager.as_ref().ok_or("Game not initialized")?;
    let msg = Message {
        update: manager.teams.clone(),
        event: Event::Sync(manager.rule.clone()),
    };
    ok!(app_handle, msg)
}

/// 状態を一つ戻す
#[tauri::command]
fn undo(
    manager: State<'_, Mutex<Option<GameManager<TeamState, Rule>>>>,
    log: State<'_, Mutex<Option<Log>>>,
    app_handle: tauri::AppHandle,
) -> Result<Message, String> {
    let mut log = log.lock().unwrap();
    let log = log.as_mut().ok_or("Game not initialized")?;
    let m = log.undo().ok_or("No more undo")?;
    manager.lock().unwrap().replace(m.clone());
    let GameManager { teams, rule } = m;
    let msg = Message {
        update: teams,
        event: Event::Sync(rule),
    };
    ok!(app_handle, msg)
}

/// 状態を一つ進める
#[tauri::command]
fn redo(
    manager: State<'_, Mutex<Option<GameManager<TeamState, Rule>>>>,
    log: State<'_, Mutex<Option<Log>>>,
    app_handle: tauri::AppHandle,
) -> Result<Message, String> {
    let mut log = log.lock().unwrap();
    let log = log.as_mut().ok_or("Game not initialized")?;
    let m = log.redo().ok_or("No more redo")?;
    manager.lock().unwrap().replace(m.clone());
    let GameManager { teams, rule } = m;
    let msg = Message {
        update: teams,
        event: Event::Sync(rule),
    };
    ok!(app_handle, msg)
}

/// ゲームを初期化する
#[tauri::command]
fn initialize(
    manager: State<'_, Mutex<Option<GameManager<TeamState, Rule>>>>,
    log: State<'_, Mutex<Option<Log>>>,
    app_handle: tauri::AppHandle,
    names: Vec<String>,
) -> Result<Message, String> {
    let rule = Rule::default();
    let game_manager = smashquiz::GameManager::new(rule.clone(), names);
    let msg = Message {
        update: game_manager.teams.clone(),
        event: Event::Initialize(rule),
    };
    manager
        .lock()
        .unwrap()
        .borrow_mut()
        .replace(game_manager.clone());
    // ログを初期化
    log.lock()
        .unwrap()
        .borrow_mut()
        .replace(Log::new(&game_manager));
    ok!(app_handle, msg)
}

/// ダメージを与える
#[tauri::command]
fn damage(
    manager: State<'_, Mutex<Option<GameManager<TeamState, Rule>>>>,
    log: State<'_, Mutex<Option<Log>>>,
    app_handle: tauri::AppHandle,
    attacker: String,
    correct: bool,
) -> Result<Message, String> {
    let mut manager = manager.lock().unwrap();
    let manager = manager.as_mut().ok_or("Game not initialized")?;
    let update = manager
        .damage(&attacker, correct)
        .map_err(|e| e.to_string())?;
    let msg = Message {
        update,
        event: Event::Answer {
            actor_type: Actor::Damage,
            success: correct,
        },
    };
    // ログを更新
    if let Some(log) = log.lock().unwrap().borrow_mut().as_mut() {
        log.commit(manager);
    } else {
        log.lock().unwrap().borrow_mut().replace(Log::new(manager));
    }
    ok!(app_handle, msg)
}

/// スマッシュ攻撃を行う
#[tauri::command]
fn smash(
    manager: State<'_, Mutex<Option<GameManager<TeamState, Rule>>>>,
    log: State<'_, Mutex<Option<Log>>>,
    app_handle: tauri::AppHandle,
    attacker: String,
    correct: bool,
) -> Result<Message, String> {
    let mut manager = manager.lock().unwrap();
    let manager = manager.as_mut().ok_or("Game not initialized")?;
    let update = manager
        .smash(&attacker, correct)
        .map_err(|e| e.to_string())?;
    let msg = Message {
        update,
        event: Event::Answer {
            actor_type: Actor::Smash,
            success: correct,
        },
    };
    // ログを更新
    if let Some(log) = log.lock().unwrap().borrow_mut().as_mut() {
        log.commit(manager);
    } else {
        log.lock().unwrap().borrow_mut().replace(Log::new(manager));
    }
    ok!(app_handle, msg)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            initialize, damage, smash, sync, undo, redo
        ])
        .setup(|app| {
            app.manage(Mutex::new(Option::<GameManager<TeamState, Rule>>::None));
            app.manage(Mutex::new(Option::<Log>::None));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
