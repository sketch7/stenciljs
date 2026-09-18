import { AppLolDraftLobbyHost } from "@app/stencil-playground/react";
import type { JSX } from "react";

const containerStyle = { height: "calc(100vh - 0px)", display: "flex", flexDirection: "column" as const };
const hostStyle = { flex: "1", minHeight: "0" };

export default function Page(): JSX.Element {
	return (
		<div style={containerStyle}>
			<AppLolDraftLobbyHost style={hostStyle} />
		</div>
	);
}
