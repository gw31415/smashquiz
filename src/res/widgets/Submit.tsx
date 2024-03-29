import { css } from "@emotion/css";

export function Submit(props: { correct: boolean; disabled: boolean; onClick: () => void }) {
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
			onClick={props.onClick}
		>
			{props.correct ? "正解" : "不正解"}
		</button>
	);
}



