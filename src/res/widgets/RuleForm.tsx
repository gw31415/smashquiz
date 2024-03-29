import type { Rule } from "../../types";

const conf: GameConfig = {
  rule: {
    damageIfCorrect: {
      mean: 0.1,
      stdDev: 0.05,
    },
    damageIfIncorrect: {
      mean: 0.2,
      stdDev: 0.1,
    },
    stock: {
      count: 5,
      canSteal: false,
    },
  },
  names: [
    "宇宙のモフモフ探検隊",
    "カエルの革命家たち",
    "時速5kmのスナイパー",
    "パンダの逆襲",
    "未確認飛行ニンジン",
    "秘密結社クワガタムシ",
  ],
};

interface GameConfig {
  rule: Rule;
  names: string[];
}

export function RuleForm(props: {
  onSubmit: (rule: Rule, names: string[]) => void;
}) {
  const gameConfig: GameConfig = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gameConfig") ?? "");
      return stored;
    } catch {
      localStorage.setItem("gameConfig", JSON.stringify(conf));
      return conf;
    }
  })();
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
        localStorage.setItem("gameConfig", JSON.stringify({ rule, names }));
        props.onSubmit(rule, names);
      }}
    >
      <div>
        <label>
          チーム名:
          <textarea name="names" value={gameConfig.names.join("\n")}></textarea>
        </label>
      </div>
      <div>
        <label>
          成功ダメージの中央値(%):
          <input
            type="number"
            name="damage_if_correct_mean"
            value={`${gameConfig.rule.damageIfCorrect.mean * 100}`}
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
            value={`${gameConfig.rule.damageIfCorrect.stdDev * 100}`}
            min="0"
            max="100"
            required
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
            value={`${gameConfig.rule.damageIfIncorrect.mean * 100}`}
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
            value={`${gameConfig.rule.damageIfIncorrect.stdDev * 100}`}
            min="0"
            max="100"
            required
            step="1"
          />
        </label>
      </div>
      <div>
        <label>
          ストック制:
          <input
            type="checkbox"
            name="stock_enabled"
            value={`${gameConfig.rule.stock ? "on" : ""}`}
          />
        </label>
      </div>
      <div>
        <label>
          ストック数:
          <input
            type="number"
            name="stock_count"
            value={`${gameConfig.rule.stock?.count ?? "5"}`}
            min="1"
            max="20"
            required
            step="1"
          />
        </label>
      </div>
      <div>
        <label>
          スマッシュ成功時にストックを奪う:
          <input
            type="checkbox"
            name="stock_steal"
            value={`${gameConfig.rule.stock?.canSteal ? "on" : ""}`}
          />
        </label>
      </div>
      <button type="submit">開始</button>
    </form>
  );
}
