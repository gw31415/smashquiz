import { css } from "@emotion/css";

export function SelectionTile(props: {
	mode: "damage" | "smash" | "dead";
	onClick: () => void;
	isSelected: boolean;
}) {
	return (
		<div
			class={css(
				css`
          display: flex;
          align-items: center;
          justify-content: center;
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
        `,
				props.mode !== "dead"
					? "cursor: pointer"
					: css`
              &:hover {
                opacity: 0.8;
              }
            `,
			)}
			classList={{
				selected: props.isSelected,
				[props.mode]: true,
			}}
			onClick={props.onClick}
		>
			{props.mode.toUpperCase()}
		</div>
	);
}
