/* @refresh reload */
import { render } from "solid-js/web";
import ScoreBoard from "./pages/ScoreBoard";
import Admin from "./pages/Admin";
import "./index.scss";
import "@fontsource-variable/m-plus-1-code";
import { Route, Router } from "@solidjs/router";

render(
	() => (
		<Router>
			<Route path="/" component={Admin} />
			<Route path="/view" component={ScoreBoard} />
		</Router>
	),
	document.getElementById("root") as HTMLElement,
);
