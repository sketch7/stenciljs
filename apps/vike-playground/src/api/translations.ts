import { Hono } from "hono";

export const translationsData = {
	"authshell-dashboard.message": "Welcome to AuthShell Dashboard",
	"general.no-data": "No data found",
	"general.not-found": "Not found",
	"general.error": "Error",
	"general.success": "Success",
	"nav.dashboard": "Dashboard",
	"nav.profile": "Profile",
	"nav.settings": "Settings",
	"profile.title": "User Profile",
	"profile.display-name": "Display Name",
	"profile.save": "Save Changes",
	"profile.save:success": "{{name}} has been saved successfully",
	"profile.activity": "Activity",
	"profile.activity:no-data": "No activity yet",
} as const;

export const translationsApi = new Hono().get("/api/translations", c => c.json(translationsData));
