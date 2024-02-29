import { css } from "@emotion/css";
import { createSignal, For, Show } from "solid-js";
import "@fontsource/russo-one";
import "@fontsource/rocknroll-one";

import type { Game, Message, Rule, TeamState } from "../types";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api";
import chroma from "chroma-js";
import { FaSolidSkull } from "solid-icons/fa";
import { AiFillHeart, AiFillStar } from "solid-icons/ai";

const damageColorScale = chroma
  .scale(["white", "#ff4d00", "red", "#a70000"])
  .mode("lab");

const colorPalette = [
  "#4ABF4F",
  "#1FCBCB",
  "#E53935",
  "#C0CA33",
  "#B66969",
  "#9C27B0",
];

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
  invoke<Message>("sync").then(handleMessage);

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
            font-family: "RocknRoll One";
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
        <For
          each={Object.entries(game()!.states ?? {}).sort(
            ([keya, _], [keyb, __]) => keya.localeCompare(keyb),
          )}
        >
          {([name, state], i) => {
            return (
              <TeamRow
                name={name}
                state={state}
                rule={game()!.rule}
                color={colorPalette[i() % colorPalette.length]}
              />
            );
          }}
        </For>
      </div>
    </Show>
  );
}

function TeamRow(props: {
  name: string;
  state: TeamState;
  rule: Rule;
  color: string;
}) {
  const stock = props.rule.stock;
  const doubleHalfStyle = css`
    display: grid;
    align-items: center;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    gap: 2rem;
  `;
  return (
    <div
      class={css(
        `
        font-family: "RocknRoll One";
        font-size: 4rem;
        border-top: 1px solid white;
        border-bottom: 1px solid white;
        background: linear-gradient(to bottom right, ${props.color} 30%, transparent);
      `,
        doubleHalfStyle,
      )}
    >
      <div
        class={css`
          margin-left: 1.5rem;
        `}
      >
        {props.name}
      </div>
      <div class={doubleHalfStyle}>
        <div
          class={css`
            -webkit-text-stroke: 4px #1e1e1e;
            text-stroke: 3px #1e1e1e;
            font-family: "Russo One";
            font-size: 8rem;
            text-align: right;
            color: ${damageColorScale(Math.min(props.state.damage, 1)).hex()};
          `}
        >
          <i>
            {(100 * props.state.damage).toPrecision(3)}
            <span
              class={css`
                font-size: 70%;
                -webkit-text-stroke: 2px #1e1e1e;
                text-stroke: 2px #1e1e1e;
                margin-left: 0.15em;
              `}
            >
              %
            </span>
          </i>
        </div>
        <div
          class={css`
            gap: 2rem;
            display: grid;
            template-grid-rows: 1fr 1fr;
          `}
        >
          <Show
            when={stock}
            fallback={
              <>
                <LiveRow count={props.state.up} mode="win" />
                <LiveRow count={props.state.down} mode="death" />
              </>
            }
          >
            <>
              <LiveRow
                count={
                  stock!.canSteal
                    ? stock!.count + props.state.up - props.state.down
                    : stock!.count - props.state.down
                }
                mode="life"
              />
            </>
          </Show>
        </div>
      </div>
    </div>
  );
}

function LiveRow(props: { count: number; mode: "life" | "win" | "death" }) {
  const MAX_COUNT = 8;
  const Icon =
    props.mode === "life"
      ? () => <AiFillHeart color="#E91E63" />
      : props.mode === "win"
        ? () => <AiFillStar color="#FDD835" />
        : () => <FaSolidSkull color="#E0E0E0" />;
  return (
    <div
      class={css`
        display: flex;
        align-items: center;
        font-size: 3rem;
        height: 2rem;
        gap: 0.2rem;
      `}
    >
      <Show
        when={props.count > MAX_COUNT}
        fallback={
          <For each={Array.from({ length: props.count }, (_, i) => i)}>
            {() => <Icon />}
          </For>
        }
      >
        <Icon />
        <div>×</div>
        <div>{props.count}</div>
      </Show>
    </div>
  );
}
