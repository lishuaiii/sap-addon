github.showNames = {
    optionName: "github-show-names",
    // query, href exceptions, and queryTooltips will be filled with values below
    query: ``,
    hrefExceptions: [],
    userMentions: [],
    queryTooltips: ``,
    regexNameOnProfilePage: `<span class="p-name vcard-fullname d-block overflow-hidden" itemprop="name">([^<]*)</span>`,
    userIdFalsePositives: ["edited", "github-actions"],
    documentTitle: {
        optionName: "github-replace-names-in-document-title",
        userIdRegex: "[dDiI]\\d{6}|[cC]\\d{7}",
        rules: [
            { prefix: ` by `, suffix: ` · Pull Request` },
            { prefix: ` · `, suffix: `/` },
            { prefix: "^", prefixReplace: "", suffix: "/" },
            { prefix: "^", prefixReplace: "", suffix: "'s access for" },
        ],
    },
};

function initializeGitHubIdQueries() {
    // commit author, direct mentions
    _addQuery(`.user-mention`, { userMention: true });
    // several places where username can be found (hovering opens card with profile info)
    _addQuery(`[data-hovercard-type=user]`);
    // ???
    _addQuery(`a.text-emphasized.Link--primary`);
    // contributor list of a repo
    //_addQuery(`a.Link--primary.no-underline.flex-self-center strong`);
    // (pending) reviewers in PR ("xyz was requested for review" / "xyz approved these changes")
    _addQuery(
        `details.js-merge-review-section div.merge-status-item.review-item.js-details-container.Details div.review-status-item strong.text-emphasized`,
        {
            hrefException: (element) => {
                return element?.parentElement?.parentElement?.querySelector("[data-hovercard-type=user]");
            },
        }
    );
    // PR: "xyz requested your review" box
    _addQuery(`div#repo-content-pjax-container div.flash.flash-warn div a.text-emphasized.Link--primary`);
    // projects: card/issue creator
    _addQuery(`div.project-column div.d-flex small.color-fg-muted a.color-fg-default`);
    // projects: activity pane
    _addQuery(`div.js-project-activity-pane.Details ul.js-project-activity-container li p a.text-bold`, { userMention: true });
    // wiki revisions history
    _addQuery(`#wiki-wrapper #version-form div > a.Link--muted span.text-bold`);
    // recent activity in dashboard (user commented)
    _addQuery(
        `div.js-recent-activity-container div.Box ul li.Box-row div.dashboard-break-word.lh-condensed.color-text-secondary span.color-text-secondary`,
        {
            hrefException: (element) => {
                return element.textContent.trim().endsWith(" commented") && element.textContent.trim() !== "You commented";
            },
        }
    );
    // comment edit history
    _addQuery(`span.js-comment-edit-history details summary div span`);
    _addQuery(`div.js-suggested-changes-contents span details.dropdown summary.btn-link div span`);
    _addQuery(
        `details details-menu.dropdown-menu.js-comment-edit-history-menu ul li button.btn-link span.css-truncate-target.v-align-middle.text-bold`
    );
    // dialog with comment edit history
    _addQuery(`details.details-overlay details-dialog div div div span.css-truncate-target.v-align-middle.text-bold.text-small`, {
        hrefException: true,
    });
    // dashboard: PR comments (white box: xyz commented ... ago)
    _addQuery(`div.issues_comment div.message a.Link--secondary > span.Link--primary.text-bold`);
    // team members in hovercard of a team in dashboard > your teams
    _addQuery(`div.Popover-message div.d-flex > div.color-fg-muted > span.css-truncate.tooltipped span.css-truncate-target.text-bold`, { hrefException: true });
    // comment resolver in PR reviews (Conversation)
    _addQuery(`form.js-resolvable-timeline-thread-form strong`, { hrefException: true });
    // comment resolver in PR (Files Changed)
    _addQuery(
        `div.js-resolvable-timeline-thread-container div.comment-holder.js-line-comments div.js-resolvable-thread-toggler-container strong`,
        { hrefException: true }
    );
    _addQuery(
        `div.comment-holder details.review-thread-component.js-comment-container summary.js-toggle-outdated-comments strong`,
        { hrefException: true }
    );
    // member statuses on team's overview page (directly next to icon)
    _addQuery(`div.user-status-container a.Link--primary.text-bold.no-underline[data-hovercard-type="user"]`);
    // list of users who contributed to a file (directly next to icon)
    _addQuery(`details#blob_contributors_box details-dialog ul li a.Link--primary.no-underline`);
    // commit list (Files Changed view of PR)
    _addQuery(`#files_bucket div.pr-toolbar div.diffbar a.select-menu-item div.select-menu-item-text span.description`);
    // chart tooltip (insights > pulse)
    _addQuery(`body > div.svg-tip.n strong ~ strong`);
    // user details in organization's admin view (people > specific user)
    _addQuery(`div.table-list-header > span.table-list-heading > strong`, { hrefException: true }); // xyz has access to n repos
    _addQuery(`p.org-user-notice-content > strong:first-child`, { hrefException: true }); // as an owner, xyz has ...
    // search: issues (xyz opened on ...) and commits (xyz committed ...)
    _addQuery(`div.issue-list-item div.text-small a.text-bold:not([data-hovercard-type="repository"])`);

    // tooltips (reactions)
    _addTooltipQuery(`tool-tip[for^=reactions--reaction_button_component-]`);
    // tooltips: dashboard -> your teams -> popup (team member profile pictures)
    _addTooltipQuery(`div.AvatarStack div.AvatarStack-body.tooltipped`);
}
function _addQuery(query, options = {}) {
    github.showNames.query += (github.showNames.query === "" ? "" : ",\n") + query;

    if (options?.hrefException) {
        switch (typeof options.hrefException) {
            case "boolean":
                github.showNames.hrefExceptions.push((element) => {
                    return element.matches(query);
                });
                break;

            case "function":
                github.showNames.hrefExceptions.push((element) => {
                    if (!element.matches(query)) return false;
                    return options?.hrefException(element);
                });
                break;

            default:
                console.error("Unexpected hrefException", options.hrefException);
                break;
        }
    }

    if (options?.userMention) {
        github.showNames.userMentions.push(query);
    }
}
function _addTooltipQuery(query) {
    github.showNames.queryTooltips += (github.showNames.queryTooltips === "" ? "" : ",\n") + query;
}
function initializeFurtherHrefExceptions() {
    github.showNames.hrefExceptions.push(_isInsightsPulseTooltip);
}
initializeGitHubIdQueries();
initializeFurtherHrefExceptions();

function replaceGitHubIdsWithUsername() {
    executeFunctionAfterPageLoaded(function () {
        /* execute once in cases where observer is not registered before
         * elements are changed/created (e.g. gets enabled in options)
         */
        _replaceAllChildsWhichAreUserId(document.body);
    });

    domObserver.registerCallbackFunction(github.showNames.optionName, function (mutations, _observer) {
        for (const { target } of mutations) {
            _replaceAllChildsWhichAreUserId(target);
        }
    });
}
function showGitHubIdsAgain() {
    domObserver.unregisterCallbackFunction(github.showNames.optionName);
    for (const element of document.querySelectorAll("[data-sap-addon-user-id]")) {
        element.textContent = element.getAttribute("data-sap-addon-user-id");
        element.removeAttribute("data-sap-addon-user-id");
    }
    for (const element of document.querySelectorAll("[data-sap-addon-tooltip-original-content-aria-label]")) {
        element.setAttribute("aria-label", element.getAttribute("data-sap-addon-tooltip-original-content-aria-label"));
        element.removeAttribute("data-sap-addon-tooltip-original-content-aria-label");
    }
    for (const element of document.querySelectorAll("[data-sap-addon-tooltip-original-content-text-content]")) {
        element.textContent = element.getAttribute("data-sap-addon-tooltip-original-content-text-content");
        element.removeAttribute("data-sap-addon-tooltip-original-content-text-content");
    }
}
function _replaceAllChildsWhichAreUserId(element) {
    try {
        for (const queryMatch of element.querySelectorAll(github.showNames.query)) {
            _replaceElementIfUserId(queryMatch);
        }
    } catch {}
    try {
        for (const queryMatch of element.querySelectorAll(github.showNames.queryTooltips)) {
            _replaceElementsTooltip(queryMatch);
        }
    } catch {}
}
async function _replaceElementIfUserId(element) {
    const { userId, prefix, suffix } = _getUserIdIfElementIsUserId(element);
    if (userId) {
        if (element.hasAttribute("data-sap-addon-already-getting-username")) return;
        element.setAttribute("data-sap-addon-already-getting-username", "true");
        let previousWidthInsightPulseTooltip = null;
        if (_isInsightsPulseTooltip(element)) {
            previousWidthInsightPulseTooltip = element.parentElement.getBoundingClientRect().width;
        }

        const username = await _getUsername(userId);
        if (username) {
            const el = getDirectParentOfText(element, prefix + userId + suffix);
            if (el) {
                el.textContent = prefix + username + suffix;
                el.setAttribute("data-sap-addon-user-id", prefix + userId + suffix);

                if (previousWidthInsightPulseTooltip) {
                    const currentWidth = element.parentElement.getBoundingClientRect().width;
                    const offsetLeft = parseFloat(element.parentElement.style.left);
                    element.parentElement.style.left = `${offsetLeft + (previousWidthInsightPulseTooltip - currentWidth) / 2}px`;
                }
            }
        }
        element.removeAttribute("data-sap-addon-already-getting-username");
    }
}
function _getUserIdIfElementIsUserId(element) {
    let userId =
        !element.hasAttribute("data-sap-addon-user-id") && !element.querySelector("[data-sap-addon-user-id]")
            ? element.textContent.trim()
            : null;
    if (userId === "" || !isElementALink(element)) {
        if (!_hrefException(element)) {
            userId = null;
        }
    }
    if (userId) {
        userId = _exceptionForCommitListPRFilesChanged(element, userId);
    }
    if (userId) {
        for (const possiblePrefixOrSuffix of [
            {
                prefix: "@",
                furtherChecks: () => {
                    return github.showNames.userMentions.findIndex((q) => element.matches(q)) !== -1;
                },
            },
            { prefix: "edited by " },
            { suffix: " commented" },
        ]) {
            if (
                ((possiblePrefixOrSuffix.prefix && userId.startsWith(possiblePrefixOrSuffix.prefix)) ||
                    (possiblePrefixOrSuffix.suffix && userId.endsWith(possiblePrefixOrSuffix.suffix))) &&
                (!("furtherChecks" in possiblePrefixOrSuffix) || possiblePrefixOrSuffix.furtherChecks())
            ) {
                return {
                    prefix: possiblePrefixOrSuffix.prefix || "",
                    userId: userId.substring(
                        (possiblePrefixOrSuffix.prefix || "").length,
                        userId.length - (possiblePrefixOrSuffix.suffix || "").length
                    ),
                    suffix: possiblePrefixOrSuffix.suffix || "",
                };
            }
        }
    }
    return { prefix: "", userId, suffix: "" };
}
function _hrefException(element) {
    for (const hrefException of github.showNames.hrefExceptions) {
        if (hrefException(element)) {
            return true;
        }
    }
    return false;
}
function _exceptionForCommitListPRFilesChanged(element, userId) {
    if (element.matches(`a.select-menu-item div.select-menu-item-text span.description`)) {
        if (
            element.childNodes.length === 3 &&
            element.childNodes[1].nodeName === "RELATIVE-TIME" &&
            element.childNodes[2].nodeName === "#text"
        ) {
            if (element.childNodes[0].nodeName !== "#text") {
                // already replaced
                return null;
            }
            if (element.childNodes[0].textContent.endsWith(" commits")) return null;
            return replaceTextNodeWithDomElementForUsername(element, 0).textContent;
        } else if (element.childNodes.length === 1) {
            return null;
        }
    }
    return userId;
}

async function _replaceElementsTooltip(element) {
    if (
        element.hasAttribute("data-sap-addon-tooltip-original-content-aria-label") ||
        element.hasAttribute("data-sap-addon-tooltip-original-content-text-content") ||
        element.hasAttribute("data-sap-addon-already-replacing-tooltip")
    ) {
        return; // already replaced
    }
    element.setAttribute("data-sap-addon-already-replacing-tooltip", "true");
    
    // old tooltips use aria-label, new ones use custom html element tool-tip with textContent
    const isToolTipElement = element.nodeName === "TOOL-TIP";
    const originalTooltipText = isToolTipElement ? element.textContent.trim() : element.getAttribute("aria-label");
    const replacedTooltipText = await _getNewTooltipText(originalTooltipText);
    if (isToolTipElement) {
        element.setAttribute("data-sap-addon-tooltip-original-content-text-content", originalTooltipText);
        element.textContent = replacedTooltipText;
    } else {
        element.setAttribute("data-sap-addon-tooltip-original-content-aria-label", originalTooltipText);
        element.setAttribute("aria-label", replacedTooltipText);
    }
    element.removeAttribute("data-sap-addon-already-replacing-tooltip");
}
async function _getNewTooltipText(originalTooltipText) {
    // currently supports: emoji reactions, project issues cards
    // (A | A and B | A, B, and C) reacted with ... emoji
    // Assigned to (A | A and B | A, B, and C)
    const tooltipTypes = [{ textAfterUserIds: " reacted with " }, { textBeforeUserIds: "Assigned to " }];
    let currentTooltipType;
    for (const tooltipType of tooltipTypes) {
        if (
            (!tooltipType.textBeforeUserIds || originalTooltipText.includes(tooltipType.textBeforeUserIds)) &&
            (!tooltipType.textAfterUserIds || originalTooltipText.includes(tooltipType.textAfterUserIds))
        ) {
            currentTooltipType = tooltipType;
            break;
        }
    }
    if (!currentTooltipType) {
        // maybe only a list of userIds -> continue and see result
        currentTooltipType = {};
    }

    // split tooltip text which has following structure: "<textBefore><textBeforeUserIds><userIds><textAfterUserIds><textAfter>"
    let userIds = originalTooltipText;
    let textBefore = (textAfter = tempSplitResultAtTextBeforeUserIds = "");
    if (currentTooltipType.textBeforeUserIds) {
        [textBefore, tempSplitResultAtTextBeforeUserIds] = originalTooltipText.split(currentTooltipType.textBeforeUserIds);
        userIds = tempSplitResultAtTextBeforeUserIds;
    }
    if (currentTooltipType.textAfterUserIds) {
        [userIds, textAfter] = (tempSplitResultAtTextBeforeUserIds || originalTooltipText).split(currentTooltipType.textAfterUserIds);
    }

    const usernamePromises = [];
    if (userIds.includes(", and ")) {
        // more than two names
        const [firstUserIds, lastUserId] = userIds.split(", and ");
        for (const userId of firstUserIds.split(", ")) {
            usernamePromises.push(_getUsername(userId));
        }
        // lastUserId should not match something like "5 more" (e.g. in A, ..., B, and 5 more)
        if (!new RegExp(`\\d+ more`).exec(lastUserId)) {
            usernamePromises.push(_getUsername(lastUserId));
        }
    } else if (userIds.includes(" and ")) {
        // two names
        for (const userId of userIds.split(" and ")) {
            usernamePromises.push(_getUsername(userId));
        }
    } else {
        // one name
        usernamePromises.push(_getUsername(userIds));
    }
    const usernames = (await Promise.allSettled(usernamePromises)).map((promiseResult) => promiseResult.value);
    if (usernames.includes(null)) {
        // probably not a tooltip with usernames -> return original text
        return originalTooltipText;
    }
    return (
        textBefore +
        (currentTooltipType.textBeforeUserIds || "") +
        _makeUsernameTextForTooltip(usernames) +
        (currentTooltipType.textAfterUserIds || "") +
        textAfter
    );
}
function _makeUsernameTextForTooltip(usernames) {
    let usernameText = "";
    for (let i = 0; i < usernames.length; i++) {
        if (i !== 0 && usernames.length !== 2) {
            usernameText += ", ";
        }
        if (i === usernames.length - 1) {
            if (i === 0) {
                // only one username, no "and" needed
            } else if (i === 1) {
                usernameText += " and ";
            } else {
                // if more than two usernames there will already be a ", " (including a space)
                usernameText += "and ";
            }
        }
        usernameText += usernames[i];
    }
    return usernameText;
}

/* The request queue will store an array for each userId that should be retrieved from People/GitHub.
This array is to avoid multiple requests when a userId is requested multiple times (so that only
one request is made in the end). All waiting "observers" will be notified once the first call
received a username. When a username has been retrieved and is stored in the cache this queue is no
longer needed; it's only for the first time when _getUsername is called simultaniously multiple times
and there's no username in the cache yet.
*/
const userIdRequestQueue = {};
const userIdUpdateQueue = {};

const USERNAME_CACHE_NAME = 0;
const USERNAME_CACHE_UPDATED_AT = 1;

const USERNAME_CACHE_MAX_TIME_IN_S = 2_592_000; // 30 days: 30 * 24 * 60 * 60 = 2_592_000

async function _getUsername(userId) {
    if (!userId || github.showNames.userIdFalsePositives.includes(userId)) return null;
    const user = usernameCache[userId];
    const now = getUnixTimestamp(); // seconds/milliseconds don't matter so it's sufficient to get it only once
    if (user && user[USERNAME_CACHE_NAME]) {
        // check if value is older than threshold
        if (now - user[USERNAME_CACHE_UPDATED_AT] > USERNAME_CACHE_MAX_TIME_IN_S && !(userId in userIdUpdateQueue)) {
            // refetch in background; prevent multiple refetches
            // still return old value directly for best performance -> will only be updated when cache is requested the next time
            userIdUpdateQueue[userId] = true;
            (async () => {
                const username = await _fetchUsername(userId);
                if (username) {
                    usernameCache[userId] = [username, now];
                    saveUsernameCacheToStorage();
                }
                delete userIdUpdateQueue[userId];
            })();
        }
        return user[USERNAME_CACHE_NAME];
    } else if (userId in userIdRequestQueue) {
        return new Promise((resolve) => {
            userIdRequestQueue[userId].push(function (username) {
                resolve(username);
            });
        });
    } else {
        userIdRequestQueue[userId] = [];
        const username = await _fetchUsername(userId);
        if (username) {
            usernameCache[userId] = [username, now];
            saveUsernameCacheToStorage();
        }
        const observers = userIdRequestQueue[userId];
        delete userIdRequestQueue[userId];
        for (const notify of observers) {
            notify(username);
        }
        return username;
    }
}

function _fetchUsername(userId) {
    return new Promise(function (resolve) {
        execAsync(
            browser.runtime.sendMessage.bind(browser.runtime),
            {
                contentScriptQuery: "githubFetchUsername",
                args: [userId, url.host, github.showNames.regexNameOnProfilePage],
            },
            (username) => {
                const name = decodeHtml(username);
                resolve(name);
            }
        );
    });
}

function decodeHtml(html) {
    // https://stackoverflow.com/a/7394787
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value.trim();
}

const regexPulseTooltipTextContentBefore = new RegExp(`^ commit(|s) authored by $`);
function _isInsightsPulseTooltip(element) {
    // same query string as in github.showNames.query + additionally check for text before
    return (
        element.matches(`body > div.svg-tip.n strong ~ strong`) &&
        regexPulseTooltipTextContentBefore.test(element.parentElement.childNodes[1].textContent)
    );
}

function getUnixTimestamp() {
    return Math.floor(Date.now() / 1000);
}

function isElementALink(element) {
    // check childs
    for (const linkChild of element.querySelectorAll("[href]")) {
        if (linkChild && element.textContent.trim() === linkChild.textContent.trim()) {
            return true;
        }
    }
    // check parents
    while (true) {
        if (!element) return false;
        if (element.hasAttribute("href")) return true;
        if (
            element.classList.contains("btn-link") &&
            (element.tagName.toLowerCase() === "button" ||
                (element.tagName.toLowerCase() === "summary" && element.getAttribute("role") === "button"))
        ) {
            return true;
        }
        element = element.parentElement;
    }
}

function getDirectParentOfText(baseElement, text) {
    if (baseElement.childNodes.length === 1 && baseElement.firstChild.nodeName === "#text" && baseElement.textContent.trim() === text) {
        return baseElement;
    } else if (
        baseElement.childNodes.length === 3 &&
        baseElement.childNodes[0].nodeName === "#text" &&
        baseElement.childNodes[1].nodeName === "IMG" &&
        baseElement.childNodes[2].nodeName === "#text" &&
        baseElement.childNodes[2].textContent.trim() === text
    ) {
        // sometimes text is directly after the user icon w/o separate html tag
        // however, a real element is needed (not only a text node; a data-attribute will be set on the element later)
        return replaceTextNodeWithDomElementForUsername(baseElement, 2);
    } else {
        for (const child of baseElement.childNodes) {
            if (child.childNodes.length > 0) {
                const r = getDirectParentOfText(child, text);
                if (r) {
                    return r;
                }
            }
        }
    }
}

function replaceTextNodeWithDomElementForUsername(baseElement, indexUserId) {
    const textNode = baseElement.childNodes[indexUserId];
    const newElement = document.createElement("span");
    newElement.textContent = textNode.textContent.trim();
    baseElement.replaceChild(newElement, textNode);
    newElement.insertAdjacentHTML("afterend", " ");
    return newElement;
}

let documentTitleUserIdState = {
    observerRegistered: false,
    oldTitle: null,
    newTitle: null,
};
function replaceGitHubIdsWithUsernameInDocumentTitle() {
    executeFunctionAfterPageLoaded(function () {
        _checkDocumentTitleAndReplaceUserId();
    });

    if (!documentTitleUserIdState.observerRegistered) {
        documentTitleUserIdState.observerRegistered = true;
        new DOMObserver(document.querySelector("title")).registerCallbackFunction(
            github.showNames.documentTitle.optionName,
            function (_mutations, _observer) {
                _checkDocumentTitleAndReplaceUserId();
            }
        );
    }
}
async function _checkDocumentTitleAndReplaceUserId() {
    const title = document.title;
    if (title === documentTitleUserIdState.newTitle) {
        // document.title matches with what we set the last time (event on our change)
        return;
    }
    // GitHub changed the title -> save it so that we can restore it when feature is disabled
    documentTitleUserIdState.oldTitle = title;
    // check that feature is enabled + loop through all possible replacement rules
    if (!isEnabled(github.showNames.optionName)) return;
    if (github.showNames.documentTitle.rules.length > 1 && !new RegExp(github.showNames.documentTitle.userIdRegex).exec(title)) {
        // if there is more than 1 rule -> check if there could be a username in the title at all so that we do not run too many regexes
        return;
    }
    for (const rule of github.showNames.documentTitle.rules) {
        const regex = new RegExp(`${rule.prefix}(?<userId>${github.showNames.documentTitle.userIdRegex})${rule.suffix}`);
        const regexResult = regex.exec(title);
        if (regexResult) {
            const username = await _getUsername(regexResult.groups.userId);
            if (document.title === title) {
                // make sure title has not changed in the meantime
                const newTitle = title.replace(
                    regex,
                    `${rule.prefixReplace === undefined ? rule.prefix : rule.prefixReplace}${username}${
                        rule.suffixReplace === undefined ? rule.suffix : rule.suffixReplace
                    }`
                );
                document.title = newTitle;
                documentTitleUserIdState.newTitle = newTitle;
                break;
            }
        }
    }
}
function showGitHubIdsAgainInDocumentTitle() {
    if (documentTitleUserIdState.oldTitle) document.title = documentTitleUserIdState.oldTitle;
}

const usernameCacheName = `gh-usernameCache-${url.host}`;
let usernameCache;
let timeoutIdSavingUsernameCache = null;
function saveUsernameCacheToStorage() {
    if (!timeoutIdSavingUsernameCache) {
        timeoutIdSavingUsernameCache = setTimeout(() => {
            timeoutIdSavingUsernameCache = null;
            saveToStorage(usernameCacheName, usernameCache);
        }, 1000);
    }
}
function deleteLegacyUsernameCache() {
    return new Promise(function (resolve) {
        execAsync(browser.storage.local.remove.bind(browser.storage.local), "usernameCache", () => {
            resolve();
        });
    });
}
