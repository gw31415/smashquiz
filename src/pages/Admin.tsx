import { invoke } from "@tauri-apps/api/tauri";
import { css } from "@emotion/css";
import { createSignal, For, Show } from "solid-js";

import type { Game, Message } from "../types";

const TEAMS = ["Arsenal", "Aston Villa", "Brentford", "Brighton", "Burnley"];

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

  // 選択状態
  const [selected, setSelected] = createSignal<
    {
      team: string;
      actor: "smash" | "damage";
    } | null
  >(null);

  function Submit(props: { correct: boolean; disabled: boolean }) {
    return (
      <button
        class={css({
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
    <div
      class={css`
        color-scheme: light;
        height: 100%;
        display: grid;
        grid-template-rows: 1fr repeat(2, 60px);
        button {
          font-size: 30px;
          color: white;
        }
      `}
    >
      <Show when={game()} fallback={<div>Loading</div>}>
        <div
          class={css`
            overflow-y: scroll;
          `}
        >
          <For each={Object.entries(game()!.states)}>
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
      </Show>
    </div>
  );
}
