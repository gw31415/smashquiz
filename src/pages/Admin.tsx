import { invoke } from "@tauri-apps/api/core";
import { css } from "@emotion/css";
import { createSignal, For, onMount, Show } from "solid-js";

import type { Game, Message, Rule } from "../types";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { Submit } from "../res/widgets/Submit";
import { RuleForm } from "../res/widgets/RuleForm";
import { SelectionTile } from "../res/widgets/SelectionTile";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function Admin() {
	const [game, setGame] = createSignal<Game | null>(null);

	onMount(() => {
		const appWindow = getCurrentWindow();
		appWindow.onCloseRequested(async () => {
			const view = await WebviewWindow.getByLabel("view");
			if (view) {
				await view.setClosable(true);
				await view.close();
			}
		});
	});

	function handleMessage(msg: Message) {
		if ((msg.event as string) === "reset") {
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
	async function initialize(args: { rule: Rule; names: string[] }) {
		const msg: Message = await invoke("initialize", args);
		handleMessage(msg);
	}

	// 選択状態
	const [selected, setSelected] = createSignal<{
		team: string;
		actor: "smash" | "damage";
	} | null>(null);

	return (
		<Show
			when={game()}
			fallback={
				<RuleForm
					onSubmit={(rule, names) => initialize({ rule, names: names })}
				/>
			}
		>
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
					<button type="button" onClick={undo}>
						戻る
					</button>
					<button onClick={redo} type="button">
						進む
					</button>
					<input
						type="number"
						min="5"
						max="30"
						placeholder="文字サイズ"
						required
						onInput={(e) => {
							const size = Math.max(
								Math.min(Number.parseInt(e.target.value), 30),
								5,
							);
							invoke("ui_update", {
								uiConfig: {
									fontSize: size,
								},
							});
						}}
					/>
					<button type="button" onClick={reset}>
						リセット
					</button>
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
										<Show
											when={
												!game()!.rule.stock ||
												(game()!.rule.stock &&
													(game()!.rule.stock!.canSteal ? state.up : 0) +
														game()!.rule.stock!.count >
														state.down)
											}
											fallback={
												<SelectionTile
													mode="dead"
													onClick={() => {}}
													isSelected={false}
												/>
											}
										>
											<SelectionTile
												mode="damage"
												isSelected={
													selected()?.team === name &&
													selected()?.actor === "damage"
												}
												onClick={() => {
													if (
														selected()?.team === name &&
														selected()?.actor === "damage"
													) {
														setSelected(null);
													} else {
														setSelected({ team: name, actor: "damage" });
													}
												}}
											/>
											<SelectionTile
												mode="smash"
												isSelected={
													selected()?.team === name &&
													selected()?.actor === "smash"
												}
												onClick={() => {
													if (
														selected()?.team === name &&
														selected()?.actor === "smash"
													) {
														setSelected(null);
													} else {
														setSelected({ team: name, actor: "smash" });
													}
												}}
											/>
										</Show>
									</div>
								</div>
							);
						}}
					</For>
				</div>
				<Submit
					correct={true}
					disabled={selected() === null}
					onClick={async () => {
						const s = selected()!;
						const msg: Message = await invoke(s.actor, {
							correct: true,
							attacker: s.team,
						});
						handleMessage(msg);
						setSelected(null);
					}}
				/>
				<Submit
					correct={false}
					disabled={selected() === null}
					onClick={async () => {
						const s = selected()!;
						const msg: Message = await invoke(s.actor, {
							correct: false,
							attacker: s.team,
						});
						handleMessage(msg);
						setSelected(null);
					}}
				/>
			</div>
		</Show>
	);
}
