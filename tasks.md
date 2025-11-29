# Tasks

## Do

- feature evaluation? ok let me explain currently we commit all the time, and the user can sometimes make a commit with version bumper enabled that also bumps the minor version, and this is presumably meant to meant a somewhat of a break point or we did a bigger feature, but what if we look backed the commit history, so suppose i made 100 commits and instead of a new one  i make a commit after the 45th one to significy something, and this is not recent but we look back on the older commits like 10 commits ago and see what we added and based on this we can make an extra commit that dones't just have the 30 tiny parts, but instead look at them and realized that we added the X thing, i am not sure we can version bump so retroactively, but imagine we made a page that was 20 commits, and later we look back and see that we seem to be done with the page so we make a bigger commit that version bumps if we can, that shows what we really implemented not just the s


## Done

-   also should we ban more life patterns like \*.vscode?
-   when we open the settings with the gear icon we only see an old settings page, we should see the new settings page, and get rid of the old one
-   amazing but out api configuration section is huge, is there a way to perhaps handle it better, this is only going to get worse the more we add,
-   the settings panel looks off when i switch between providers i still can only set gemini api key, also we should be able to set keys in one section and in another set priority, where we set primary secondary tertiary
-   the timing and behavior should be able to support much longer delay times, so slider is good but also have an input field for exact delay time,
-   our ignored file patters is empty now, i used to have a list, make sure that we use it and auto fill it our list of ignored files
-   we should be able to set which provider is primary and which is backup 1 and which is backup 2
-   Are version bumping related ai commits fixed now?
    -   if not lets fix it
-   add other providers to the list of providers, like least openai, anthropic,
-   currently version bumping does work perfectly it does not cause extra commits but ai keeps making commits such as feat update 1 files, or i am not even sure it's the version bumper but we might default to this if ai fails to make a commit message?
    -   refers to commit history.txt
-   It only stopped in my example because i turned off version bumping
-   have backup ais for commits?
    -   lets have 2 backup ais for commits
-   lets also rename github copilot to just editor built in ai option
-   update the read me after this is done
