import { css } from "@emotion/css";
import { createSignal, For, Show } from "solid-js";

import type { Game, Message } from "../types";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api";

export default function ScoreBoard() {
  // null は未初期化
  const [game, setGame] = createSignal<Game | null>(null);
  async function handleMessage(msg: Message) {
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
      if (g === null) {
        // なぜか初期化されてないのに更新が来た → 初期化を試みる
        handleMessage(await invoke<Message>("sync"));
        return;
      }
      for (const [name, state] of Object.entries(msg.update)) {
        g.states[name] = state;
      }
      setGame(Object.assign({}, g));
    }
  }
  listen<Message>("message", (e) => handleMessage(e.payload));

  return (
    <Show
      when={game() !== null}
      fallback={
        <div
          class={css`
            color-scheme: dark;
            background-color: #282c34;
            color: white;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 100px;
          `}
        >
          <div>準備中……</div>
        </div>
      }
    >
      <div
        class={css`
          color-scheme: dark;
          background-color: #282c34;
          color: white;
          height: 100%;
          display: grid;
        `}
      >
        <For each={Object.entries(game()!.states ?? {})}>
          {([name, state]) => {
            const rule = game()!.rule;
            const stock = rule.stock;
            return (
              <div
                class={css`
                  display: grid;
                  grid-template-columns: 1fr repeat(3, 80px);
                `}
              >
                <div>{name}</div>
                <div>
                  {Intl.NumberFormat("ja", {
                    style: "percent",
                    maximumSignificantDigits: 3,
                    minimumSignificantDigits: 3,
                  }).format(state.damage)}
                </div>
                <Show
                  when={stock}
                  fallback={
                    <>
                      <div>＋{state.up}</div>
                      <div>－{state.down}</div>
                    </>
                  }
                >
                  <>
                    <div>
                      残機数：
                      {stock!.canSteal
                        ? stock!.count + state.up - state.down
                        : stock!.count - state.down}
                    </div>
                  </>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
