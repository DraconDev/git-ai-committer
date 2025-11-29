import * as vscode from "vscode";
import { git } from "../extension";
import { SettingsPanel } from "../settings/settingsPanel";
import { updateVersion } from "../version/versionService";

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        // Commit Now - Manual commit command
        vscode.commands.registerCommand(
            "git-ai-committer.commitNow",
            async () => {
                try {
                    const message = await vscode.window.showInputBox({
                        prompt: "Enter commit message",
                        placeHolder: "Type your commit message here",
                    });

                    if (message) {
                        await updateVersion("minor");
                        await git.commit(message, [], {
                            "--allow-empty": null,
                        });
                        await git.push();
                        vscode.window.showInformationMessage(
                            "Committed and pushed successfully!"
                        );
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(
                        "Failed to commit: " + error.message
                    );
                }
            }
        ),

        // Open Settings - Opens the comprehensive settings panel
        vscode.commands.registerCommand(
            "git-ai-committer.openSettings",
            async () => {
                SettingsPanel.createOrShow(context.extensionUri);
            }
        )
    );
}
