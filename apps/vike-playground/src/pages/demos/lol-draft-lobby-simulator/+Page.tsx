import { AppLolDraftLobbyHost } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div style={{ height: "calc(100vh - 0px)", display: "flex", flexDirection: "column" }}>
			<AppLolDraftLobbyHost style={{ flex: "1", minHeight: "0" }} />
		</div>
	);
}
