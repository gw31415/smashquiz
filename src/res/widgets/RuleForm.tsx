import type { Rule } from "../../types";

const TEAMS = [
  "宇宙のモフモフ探検隊",
  "カエルの革命家たち",
  "時速5kmのスナイパー",
  "パンダの逆襲",
  "未確認飛行ニンジン",
  "秘密結社クワガタムシ",
];

export function RuleForm(props: {
  onSubmit: (rule: Rule, names: string[]) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
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
        const names = getValue("names")
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        const rule: Rule = {
          damageIfCorrect: {
            mean: getFloatValue("damage_if_correct_mean") / 100,
            stdDev: getFloatValue("damage_if_correct_std_dev") / 100,
          },
          damageIfIncorrect: {
            mean: getFloatValue("damage_if_incorrect_mean") / 100,
            stdDev: getFloatValue("damage_if_incorrect_std_dev") / 100,
          },
          stock: getCheckboxValue("stock_enabled")
            ? {
                count: getFloatValue("stock_count"),
                canSteal: getCheckboxValue("stock_steal"),
              }
            : undefined,
        };
        props.onSubmit(rule, names);
      }}
    >
      <div>
        <label>
          チーム名:
          <textarea name="names" value={TEAMS.join("\n")}></textarea>
        </label>
      </div>
      <div>
        <label>
          成功ダメージの中央値(%):
          <input
            type="number"
            name="damage_if_correct_mean"
            value="10"
            min="0"
            max="100"
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
            value="5"
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
            value="20"
            min="0"
            max="100"
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
            value="10"
            min="0"
            max="100"
            step="1"
          />
        </label>
      </div>
      <div>
        <label>
          ストック制:
          <input type="checkbox" name="stock_enabled" />
        </label>
      </div>
      <div>
        <label>
          ストック数:
          <input
            type="number"
            name="stock_count"
            value="5"
            min="1"
            max="20"
            step="1"
          />
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
  );
}
