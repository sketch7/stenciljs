// https://vike.dev/Head

import logoUrl from "../../assets/logo.svg";

// Runs synchronously in <head> before first paint to avoid FOUC.
// Reads localStorage "ssv-theme" (system|light|dark), resolves system via
// prefers-color-scheme, and writes data-theme on <html>.
const themeInitScript = `(function(){try{var p=localStorage.getItem("ssv-theme")||"system";document.documentElement.dataset.theme=p==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;}catch(e){}})();`;

const dangerousHtmlProps = { __html: themeInitScript };

export function Head() {
	return (
		<>
			<link rel="icon" href={logoUrl} />
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional inline FOUC-prevention script */}
			<script dangerouslySetInnerHTML={dangerousHtmlProps} />
		</>
	);
}
