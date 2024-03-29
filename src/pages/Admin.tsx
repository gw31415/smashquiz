import { invoke } from "@tauri-apps/api/tauri";
import { css } from "@emotion/css";
import { createSignal, For, onMount, Show } from "solid-js";

import type { Game, Message, Rule } from "../types";
import { appWindow, WebviewWindow } from "@tauri-apps/api/window";

const TEAMS = [
  "宇宙のモフモフ探検隊",
  "カエルの革命家たち",
  "時速5kmのスナイパー",
  "パンダの逆襲",
  "未確認飛行ニンジン",
  "秘密結社クワガタムシ",
];

const selectCss = css`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  letter-spacing: 4px;
  border: solid 1px black;
`;

export default function Admin() {
  const [game, setGame] = createSignal<Game | null>(null);

  onMount(() => {
    appWindow.onCloseRequested(async () => {
      const view = WebviewWindow.getByLabel("view");
      if (view) {
        await view.setClosable(true);
        await view.close();
      }
    });
  });

  function handleMessage(msg: Message) {
    if (msg.event as String === "reset") {
      setGame(null);
    } else if (msg.event.hasOwnProperty("initialize")) {
      const rule = msg.event.initialize;
      // 全ての状態を更新
      setGame({
        rule,
        states: msg.update,
      });
    } else if (msg.event.hasOwnProperty("sync")) {
      // 全ての状態を更新
      const rule = msg.event.sync;
      setGame({
        rule,
        states: msg.update,
      });
    } else {
      // 一部の状態を更新
      const g = game();
      if (!g) {
        throw new Error(
          "Unreachable: Don't call handleMessage before initialization.",
        );
      }
      for (const [name, state] of Object.entries(msg.update)) {
        g.states[name] = state;
      }
      setGame(Object.assign({}, g));
    }
  }

  async function reset() {
    handleMessage(await invoke("reset"));
  }

  async function undo() {
    handleMessage(await invoke("undo"));
  }
  async function redo() {
    handleMessage(await invoke("redo"));
  }

  // ゲームの初期化
  async function initialize(args: { rule: Rule, names: string[] }) {
    const msg: Message = await invoke("initialize", args);
    handleMessage(msg);
  }

  // 選択状態
  const [selected, setSelected] = createSignal<{
    team: string;
    actor: "smash" | "damage";
  } | null>(null);

  function Submit(props: { correct: boolean; disabled: boolean }) {
    return (
      <button
        class={css({
          fontSize: 30,
          color: "white",
          backgroundColor: props.correct ? "#F44336" : "#283593",
          [":disabled"]: {
            backgroundColor: "#E0E0E0",
            color: "#757575",
          },
        })}
        disabled={props.disabled}
        onClick={async () => {
          const s = selected()!;
          const msg: Message = await invoke(s.actor, {
            correct: props.correct,
            attacker: s.team,
          });
          handleMessage(msg);
          setSelected(null);
        }}
      >
        {props.correct ? "正解" : "不正解"}
      </button>
    );
  }

  return (
    <Show when={game()} fallback={<div>
      <form onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        function getValue(name: string): string {
          return form.get(name) as string;
        }
        function getFloatValue(name: string): number {
          const str = getValue(name);
          return parseFloat(str);
        }
        function getCheckboxValue(name: string): boolean {
          const str = getValue(name);
          return str === "on";
        }
        const names = getValue("names").split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
        const rule: Rule = {
          damageIfCorrect: {
            mean: getFloatValue("damage_if_correct_mean") / 100,
            stdDev: getFloatValue("damage_if_correct_std_dev") / 100,
          },
          damageIfIncorrect: {
            mean: getFloatValue("damage_if_incorrect_mean") / 100,
            stdDev: getFloatValue("damage_if_incorrect_std_dev") / 100,
          },
          stock: getCheckboxValue("stock_enabled") ? {
            count: getFloatValue("stock_count"),
            canSteal: getCheckboxValue("stock_steal"),
          } : undefined,
        };
        initialize({ rule, names: names });
      }}>
        <div>
          <label>
            チーム名:
            <textarea name="names" value={TEAMS.join("\n")}></textarea>
          </label>
        </div>
        <div>
          <label>
            成功ダメージの中央値(%):
            <input type="number" name="damage_if_correct_mean" value="10" min="0" max="100" />
          </label>
        </div>
        <div>
          <label>
            成功ダメージの標準偏差(%):
            <input type="number" name="damage_if_correct_std_dev" value="5" min="0" max="100" />
          </label>
        </div>
        <div>
          <label>
            失敗ダメージの中央値(%):
            <input type="number" name="damage_if_incorrect_mean" value="20" min="0" max="100" />
          </label>
        </div>
        <div>
          <label>
            失敗ダメージの標準偏差(%):
            <input type="number" name="damage_if_incorrect_std_dev" value="10" min="0" max="100" />
          </label>
        </div>
        <div>
          <label>
            ストック:
            <input type="checkbox" name="stock_enabled" />
          </label>
        </div>
        <div>
          <label>
            ストック数:
            <input type="number" name="stock_count" value="5" min="1" max="20" />
          </label>
        </div>
        <div>
          <label>
            スマッシュ成功時にストックを奪う:
            <input type="checkbox" name="stock_steal" />
          </label>
        </div>
        <button type="submit">開始</button>
      </form>

    </div>}>
      <div
        class={css`
          color-scheme: light;
          height: 100%;
          display: grid;
          grid-template-rows: 4ex 1fr repeat(2, 60px);
        `}
      >
        <div
          class={css`
            display: flex;
          `}
        >
          <button onClick={undo}>戻る</button>
          <button onClick={redo}>進む</button>
          <input
            type="range"
            min="5"
            max="30"
            onChange={(e) => {
              const size = parseInt(e.target.value);
              invoke("ui_update", {
                uiConfig: {
                  fontSize: size,
                },
              });
            }}
          />
          <button onClick={reset}>リセット</button>
        </div>
        <div
          class={css`
            overflow-y: scroll;
          `}
        >
          <For
            each={Object.entries(game()!.states).sort(([keya, _], [keyb, __]) =>
              keya.localeCompare(keyb),
            )}
          >
            {([name, state]) => {
              function Selection(props: { actor: "damage" | "smash" }) {
                const isSelected = () =>
                  selected()?.team === name &&
                  selected()?.actor === props.actor;
                return (
                  <div
                    class={css(selectCss, css`
                      cursor: pointer;
                      &.damage {
                        background-color: #a1887f;
                        &.selected {
                          background-color: #3e2723;
                          color: white;
                        }
                      }
                      &.smash {
                        background-color: #ba68c8;
                        &.selected {
                          background-color: #6a1b9a;
                          color: white;
                        }
                      }
                      &:hover {
                        opacity: 0.8;
                      }
                    `)}
                    classList={{
                      selected: isSelected(),
                      [props.actor]: true,
                    }}
                    onClick={() => {
                      if (isSelected()) {
                        setSelected(null);
                      } else {
                        setSelected({ team: name, actor: props.actor });
                      }
                    }}
                  >
                    {props.actor.toUpperCase()}
                  </div>
                );
              }
              return (
                <div
                  class={css`
                    display: grid;
                    grid-template-columns: 1fr 400px;
                  `}
                >
                  <div
                    class={css`
                      border: solid black 1px;
                      padding: 0 8px;
                    `}
                  >
                    <div
                      class={css`
                        font-size: 30px;
                      `}
                    >
                      {name}
                    </div>
                    <div
                      class={css`
                        display: grid;
                        grid-template-columns: repeat(3, auto);
                        text-align: right;
                      `}
                    >
                      <div>
                        {Intl.NumberFormat("ja", {
                          style: "percent",
                          maximumSignificantDigits: 3,
                          minimumSignificantDigits: 3,
                        }).format(state.damage)}
                      </div>
                      <div>＋{state.up}</div>
                      <div>－{state.down}</div>
                    </div>
                  </div>
                  <div
                    class={css`
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                    `}
                  >
                    <Show when={
                      (!game()!.rule.stock) || (game()!.rule.stock && (game()!.rule.stock!.canSteal ? state.up : 0) + game()!.rule.stock!.count > state.down)
                    } fallback={
                      <div class={selectCss}>DEAD</div>
                    }>
                      <Selection actor="damage" />
                      <Selection actor="smash" />
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
        <Submit correct={true} disabled={selected() === null} />
        <Submit correct={false} disabled={selected() === null} />
      </div>
    </Show>
  );
}
