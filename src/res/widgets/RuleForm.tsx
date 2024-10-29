import { createUniqueId } from "solid-js";
import type { Rule } from "../../types";

interface FormValues {
	names: string[];
	damage_if_correct_mean: number;
	damage_if_correct_std_dev: number;
	damage_if_correct_max: number | null;
	damage_if_correct_min: number | null;
	damage_if_incorrect_mean: number;
	damage_if_incorrect_std_dev: number;
	damage_if_incorrect_max: number | null;
	damage_if_incorrect_min: number | null;
	stock_enabled: boolean;
	stock_count: number;
	stock_steal: boolean;
}

function saveAndGetGameRules(values: FormValues | undefined = undefined): {
	form: FormValues;
	rule: Rule;
	names: string[];
} {
	const form: FormValues = {
		...{
			names: [
				"宇宙のモフモフ探検隊",
				"カエルの革命家たち",
				"時速5kmのスナイパー",
				"パンダの逆襲",
				"未確認飛行ニンジン",
				"秘密結社クワガタムシ",
			],
			damage_if_correct_mean: 0.1,
			damage_if_correct_std_dev: 0.05,
			damage_if_correct_max: 0.2,
			damage_if_correct_min: 0,
			damage_if_incorrect_mean: 0.2,
			damage_if_incorrect_std_dev: 0.1,
			damage_if_incorrect_max: 0.4,
			damage_if_incorrect_min: 0,
			stock_enabled: true,
			stock_count: 5,
			stock_steal: false,
		},
		...(() => {
			try {
				return JSON.parse(
					localStorage.getItem("gameConfig") ?? "",
				) as FormValues;
			} catch {
				return {} as FormValues;
			}
		})(),
		...(values ?? {}),
	};
	localStorage.setItem("gameConfig", JSON.stringify(form));
	return {
		form,
		rule: {
			damageIfCorrect: {
				mean: form.damage_if_correct_mean,
				stdDev: form.damage_if_correct_std_dev,
				max: form.damage_if_correct_max,
				min: form.damage_if_correct_min,
			},
			damageIfIncorrect: {
				mean: form.damage_if_incorrect_mean,
				stdDev: form.damage_if_incorrect_std_dev,
				max: form.damage_if_incorrect_max,
				min: form.damage_if_incorrect_min,
			},
			stock: form.stock_enabled
				? {
						count: form.stock_count,
						canSteal: form.stock_steal,
					}
				: undefined,
		},
		names: form.names,
	};
}

export function RuleForm(props: {
	onSubmit: (rule: Rule, names: string[]) => void;
}) {
	const { form } = saveAndGetGameRules();
	const formid = createUniqueId();
	return (
		<form
			id={formid}
			onSubmit={(event) => {
				event.preventDefault();
				const form = new FormData(event.currentTarget);
				function getValue(name: string): string {
					return form.get(name) as string;
				}
				function getFloat(name: string): number {
					return Number.parseFloat(getValue(name));
				}
				function getDamage(name: string): number | null {
					const str = getValue(name);
					if (str === "") {
						return null;
					}
					return Number.parseFloat(str) / 100;
				}
				function getCheckboxValue(name: string): boolean {
					const input = document.querySelector(
						`#${formid} input[name=${name}]`,
					) as HTMLInputElement;
					return input.checked;
				}

				const { rule, names } = saveAndGetGameRules({
					names: getValue("names")
						.split("\n")
						.map((s) => s.trim())
						.filter((s) => s.length > 0),
					damage_if_correct_mean: getDamage("damage_if_correct_mean")!,
					damage_if_correct_std_dev: getDamage("damage_if_correct_std_dev")!,
					damage_if_correct_min: getDamage("damage_if_correct_min"),
					damage_if_correct_max: getDamage("damage_if_correct_max"),
					damage_if_incorrect_mean: getDamage("damage_if_incorrect_mean")!,
					damage_if_incorrect_std_dev: getDamage(
						"damage_if_incorrect_std_dev",
					)!,
					damage_if_incorrect_min: getDamage("damage_if_incorrect_min"),
					damage_if_incorrect_max: getDamage("damage_if_incorrect_max"),
					stock_enabled: getValue("game_mode") === "stock",
					stock_count: getFloat("stock_count"),
					stock_steal: getCheckboxValue("stock_steal"),
				});

				props.onSubmit(rule, names);
			}}
		>
			<div>
				<label>
					チーム名:
					<textarea name="names" value={form.names.join("\n")} />
				</label>
			</div>
			<fieldset>
				<legend>ダメージ設定</legend>
				<div>最大値や最小値は空にすることができます。</div>
				<div>
					<label>
						成功ダメージの中央値(%):
						<input
							type="number"
							name="damage_if_correct_mean"
							value={`${Math.floor(form.damage_if_correct_mean * 100)}`}
							min="0"
							max="100"
							required
							step="1"
						/>
					</label>
				</div>
				<div>
					<label>
						成功ダメージの標準偏差(%):
						<input
							type="number"
							name="damage_if_correct_std_dev"
							value={`${Math.floor(form.damage_if_correct_std_dev * 100)}`}
							min="0"
							max="100"
							required
							step="1"
						/>
					</label>
				</div>
				<div>
					<label>
						成功ダメージの最小値(%):
						<input
							type="number"
							name="damage_if_correct_min"
							value={
								form.damage_if_correct_min !== null
									? `${Math.floor(form.damage_if_correct_min * 100)}`
									: ""
							}
							min="0"
							max="100"
							step="1"
						/>
					</label>
				</div>
				<div>
					<label>
						成功ダメージの最大値(%):
						<input
							type="number"
							name="damage_if_correct_max"
							value={
								form.damage_if_correct_max !== null
									? `${Math.floor(form.damage_if_correct_max * 100)}`
									: ""
							}
							min="0"
							max="100"
							step="1"
						/>
					</label>
				</div>
				<div>
					<label>
						失敗ダメージの中央値(%):
						<input
							type="number"
							name="damage_if_incorrect_mean"
							value={`${Math.floor(form.damage_if_incorrect_mean * 100)}`}
							min="0"
							max="100"
							required
							step="1"
						/>
					</label>
				</div>
				<div>
					<label>
						失敗ダメージの標準偏差(%):
						<input
							type="number"
							name="damage_if_incorrect_std_dev"
							value={`${Math.floor(form.damage_if_incorrect_std_dev * 100)}`}
							min="0"
							max="100"
							required
							step="1"
						/>
					</label>
				</div>
				<div>
					<label>
						失敗ダメージの最小値(%):
						<input
							type="number"
							name="damage_if_incorrect_min"
							value={
								form.damage_if_incorrect_min !== null
									? `${Math.floor(form.damage_if_incorrect_min * 100)}`
									: ""
							}
							min="0"
							max="100"
							step="1"
						/>
					</label>
				</div>
				<div>
					<label>
						失敗ダメージの最大値(%):
						<input
							type="number"
							name="damage_if_incorrect_max"
							value={
								form.damage_if_incorrect_max !== null
									? `${Math.floor(form.damage_if_incorrect_max * 100)}`
									: ""
							}
							min="0"
							max="100"
							step="1"
						/>
					</label>
				</div>
			</fieldset>
			<fieldset>
				<div>
					<label>
						<input
							type="radio"
							name="game_mode"
							checked={!form.stock_enabled}
							value="point"
						/>
						ポイント制
					</label>
				</div>
				<div>
					<label>
						<input
							type="radio"
							name="game_mode"
							checked={form.stock_enabled}
							value="stock"
						/>
						ストック制
					</label>
				</div>
				<fieldset>
					<legend>ストック制ルール設定</legend>
					<div>
						<label>
							ストック数:
							<input
								type="number"
								name="stock_count"
								value={`${form.stock_count?.toString() ?? "5"}`}
								min="1"
								max="20"
								required
								step="1"
							/>
						</label>
					</div>
					<div>
						<label>
							スマッシュ成功時にストックを加算する:
							<input
								type="checkbox"
								name="stock_steal"
								checked={form.stock_steal}
							/>
						</label>
					</div>
				</fieldset>
			</fieldset>
			<button type="submit">開始</button>
		</form>
	);
}
