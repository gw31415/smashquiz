import { invoke } from "@tauri-apps/api/tauri";
import { css } from "@emotion/css";
import { createSignal, For, Show } from "solid-js";

import type { Game, Message } from "../types";

const TEAMS = [
  "宇宙のモフモフ探検隊",
  "カエルの革命家たち",
  "時速5kmのスナイパー",
  "パンダの逆襲",
  "未確認飛行ニンジン",
  "秘密結社クワガタムシ",
];

export default function Admin() {
  const [game, setGame] = createSignal<Game>();
  function handleMessage(msg: Message) {
    if (msg.event.hasOwnProperty("initialize")) {
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

  // ゲームの初期化
  (async function() {
    const msg: Message = await invoke("initialize", { names: TEAMS });
    handleMessage(msg);
  })();

  async function undo() {
    handleMessage(await invoke("undo"));
  }
  async function redo() {
    handleMessage(await invoke("redo"));
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
    <Show when={game()} fallback={<div>Loading</div>}>
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
                    class={css`
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: pointer;
                      font-size: 24px;
                      letter-spacing: 4px;
                      border: solid 1px black;
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
                    `}
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
                    <Selection actor="damage" />
                    <Selection actor="smash" />
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
