import $ from "jquery";

import {$t, $t_html} from "./i18n";
import {narrow_error} from "./narrow_error";
import * as narrow_state from "./narrow_state";
import {page_params} from "./page_params";
import * as people from "./people";
import * as settings_config from "./settings_config";
import * as spectators from "./spectators";
import * as stream_data from "./stream_data";

const SPECTATOR_STREAM_NARROW_BANNER = {
    title: "",
    html: $t_html(
        {
            defaultMessage: "This is not a <z-link>publicly accessible</z-link> conversation.",
        },
        {
            "z-link": (content_html) =>
                `<a href="/help/public-access-option">${content_html.join("")}</a>`,
        },
    ),
};

function retrieve_search_query_data() {
    // when search bar contains multiple filters, only retrieve search queries
    const current_filter = narrow_state.filter();
    const search_query = current_filter.operands("search")[0];
    const query_words = search_query.split(" ");

    const search_string_result = {
        query_words: [],
        has_stop_word: false,
    };

    // Add in stream:foo and topic:bar if present
    if (current_filter.has_operator("stream") || current_filter.has_operator("topic")) {
        const stream = current_filter.operands("stream")[0];
        const topic = current_filter.operands("topic")[0];
        if (stream) {
            search_string_result.stream_query = stream;
        }
        if (topic) {
            search_string_result.topic_query = topic;
        }
    }

    // Gather information about each query word
    for (const query_word of query_words) {
        if (page_params.stop_words.includes(query_word)) {
            search_string_result.has_stop_word = true;
            search_string_result.query_words.push({
                query_word,
                is_stop_word: true,
            });
        } else {
            search_string_result.query_words.push({
                query_word,
                is_stop_word: false,
            });
        }
    }

    return search_string_result;
}

function pick_empty_narrow_banner() {
    const default_banner = {
        title: $t({defaultMessage: "There are no messages here."}),
        // Spectators cannot start a conversation.
        html: page_params.is_spectator
            ? ""
            : $t_html(
                  {
                      defaultMessage: "Why not <z-link>start the conversation</z-link>?",
                  },
                  {
                      "z-link": (content_html) =>
                          `<a href="#" class="empty_feed_compose_stream">${content_html.join(
                              "",
                          )}</a>`,
                  },
              ),
    };
    const empty_search_narrow_title = $t({defaultMessage: "No search results"});

    const current_filter = narrow_state.filter();

    if (current_filter === undefined) {
        return default_banner;
    }

    const first_term = current_filter.operators()[0];
    const first_operator = first_term.operator;
    const first_operand = first_term.operand;
    const num_operators = current_filter.operators().length;

    if (num_operators !== 1) {
        // For invalid-multi-operator narrows, we display an invalid narrow message
        const streams = current_filter.operands("stream");

        // No message can have multiple streams
        if (streams.length > 1) {
            return {
                title: empty_search_narrow_title,
                html: $t_html({
                    defaultMessage:
                        "<p>You are searching for messages that belong to more than one stream, which is not possible.</p>",
                }),
            };
        }
        // No message can have multiple topics
        if (current_filter.operands("topic").length > 1) {
            return {
                title: empty_search_narrow_title,
                html: $t_html({
                    defaultMessage:
                        "<p>You are searching for messages that belong to more than one topic, which is not possible.</p>",
                }),
            };
        }
        // No message can have multiple senders
        if (current_filter.operands("sender").length > 1) {
            return {
                title: empty_search_narrow_title,
                html: $t_html({
                    defaultMessage:
                        "<p>You are searching for messages that are sent by more than one person, which is not possible.</p>",
                }),
            };
        }

        // For empty stream searches within other narrows, we display the stop words
        if (current_filter.operands("search").length > 0) {
            return {
                title: empty_search_narrow_title,
                search_data: retrieve_search_query_data(),
            };
        }

        if (
            page_params.is_spectator &&
            first_operator === "stream" &&
            !stream_data.is_web_public_by_stream_name(first_operand)
        ) {
            // For non web-public streams, show `login_to_access` modal.
            spectators.login_to_access(true);
            return SPECTATOR_STREAM_NARROW_BANNER;
        }

        // For other multi-operator narrows, we just use the default banner
        return default_banner;
    }

    switch (first_operator) {
        case "is":
            switch (first_operand) {
                case "starred":
                    // You have no starred messages.
                    return {
                        title: $t({defaultMessage: "You haven't starred anything yet!"}),
                        html: $t_html(
                            {
                                defaultMessage:
                                    "Learn more about starring messages <z-link>here</z-link>.",
                            },
                            {
                                "z-link": (content_html) =>
                                    `<a href="/help/star-a-message">${content_html.join("")}</a>`,
                            },
                        ),
                    };
                case "mentioned":
                    return {
                        title: $t({defaultMessage: "You haven't been mentioned yet!"}),
                        html: $t_html(
                            {
                                defaultMessage: "Learn more about mentions <z-link>here</z-link>.",
                            },
                            {
                                "z-link": (content_html) =>
                                    `<a href="/help/mention-a-user-or-group">${content_html.join(
                                        "",
                                    )}</a>`,
                            },
                        ),
                    };
                case "private":
                    // You have no private messages.
                    if (
                        page_params.realm_private_message_policy ===
                        settings_config.private_message_policy_values.disabled.code
                    ) {
                        return {
                            title: $t({
                                defaultMessage:
                                    "You are not allowed to send direct messages in this organization.",
                            }),
                        };
                    }
                    return {
                        title: $t({defaultMessage: "You have no direct messages yet!"}),
                        html: $t_html(
                            {
                                defaultMessage: "Why not <z-link>start the conversation</z-link>?",
                            },
                            {
                                // TODO: The href here is a bit weird; we probably want to migrate
                                // this to a button element down the line.
                                "z-link": (content_html) =>
                                    `<a href="#" class="empty_feed_compose_private">${content_html.join(
                                        "",
                                    )}</a>`,
                            },
                        ),
                    };
                case "unread":
                    // You have no unread messages.
                    return {
                        title: $t({defaultMessage: "You have no unread messages!"}),
                    };
                case "resolved":
                    return {
                        title: $t({defaultMessage: "No topics are marked as resolved."}),
                    };
            }
            // fallthrough to default case if no match is found
            break;
        case "stream":
            if (!stream_data.is_subscribed_by_name(first_operand)) {
                // You are narrowed to a stream which does not exist or is a private stream
                // in which you were never subscribed.

                if (page_params.is_spectator) {
                    spectators.login_to_access(true);
                    return SPECTATOR_STREAM_NARROW_BANNER;
                }

                function can_toggle_narrowed_stream() {
                    const stream_name = narrow_state.stream();

                    if (!stream_name) {
                        return false;
                    }

                    const stream_sub = stream_data.get_sub(first_operand);
                    return stream_sub && stream_data.can_toggle_subscription(stream_sub);
                }

                if (can_toggle_narrowed_stream()) {
                    return {
                        title: $t({
                            defaultMessage:
                                "You aren't subscribed to this stream and nobody has talked about that yet!",
                        }),
                        // TODO: Consider moving the button to be its own option in the template.
                        html: $t_html(
                            {
                                defaultMessage: "<z-button>Subscribe</z-button>",
                            },
                            {
                                "z-button": (content_html) =>
                                    `<button class="button white rounded stream_sub_unsub_button sea-green" type="button" name="subscription">${content_html.join(
                                        "",
                                    )}</button>`,
                            },
                        ),
                    };
                }

                return {
                    title: $t({defaultMessage: "This stream does not exist or is private."}),
                };
            }
            // else fallthrough to default case
            break;
        case "search": {
            // You are narrowed to empty search results.
            return {
                title: empty_search_narrow_title,
                search_data: retrieve_search_query_data(),
            };
        }
        case "pm-with": {
            if (!people.is_valid_bulk_emails_for_compose(first_operand.split(","))) {
                if (!first_operand.includes(",")) {
                    return {
                        title: $t({defaultMessage: "This user does not exist!"}),
                    };
                }
                return {
                    title: $t({defaultMessage: "One or more of these users do not exist!"}),
                };
            }
            const user_ids = people.emails_strings_to_user_ids_array(first_operand);
            if (
                page_params.realm_private_message_policy ===
                    settings_config.private_message_policy_values.disabled.code &&
                (user_ids.length !== 1 || !people.get_by_user_id(user_ids[0]).is_bot)
            ) {
                return {
                    title: $t({
                        defaultMessage:
                            "You are not allowed to send direct messages in this organization.",
                    }),
                };
            }
            if (!first_operand.includes(",")) {
                // You have no private messages with this person
                if (people.is_current_user(first_operand)) {
                    return {
                        title: $t({
                            defaultMessage:
                                "You have not sent any direct messages to yourself yet!",
                        }),
                        html: $t_html(
                            {
                                defaultMessage:
                                    "Why not <z-link>start a conversation with yourself</z-link>?",
                            },
                            {
                                "z-link": (content_html) =>
                                    `<a href="#" class="empty_feed_compose_private">${content_html.join(
                                        "",
                                    )}</a>`,
                            },
                        ),
                    };
                }
                return {
                    title: $t(
                        {
                            defaultMessage: "You have no direct messages with {person} yet.",
                        },
                        {person: people.get_by_user_id(user_ids[0]).full_name},
                    ),
                    html: $t_html(
                        {
                            defaultMessage: "Why not <z-link>start the conversation</z-link>?",
                        },
                        {
                            "z-link": (content_html) =>
                                `<a href="#" class="empty_feed_compose_private">${content_html.join(
                                    "",
                                )}</a>`,
                        },
                    ),
                };
            }
            return {
                title: $t({defaultMessage: "You have no direct messages with these users yet."}),
                html: $t_html(
                    {
                        defaultMessage: "Why not <z-link>start the conversation</z-link>?",
                    },
                    {
                        "z-link": (content_html) =>
                            `<a href="#" class="empty_feed_compose_private">${content_html.join(
                                "",
                            )}</a>`,
                    },
                ),
            };
        }
        case "sender": {
            const sender = people.get_by_email(first_operand);
            if (sender) {
                return {
                    title: $t(
                        {
                            defaultMessage:
                                "You haven't received any messages sent by {person} yet.",
                        },
                        {person: sender.full_name},
                    ),
                };
            }
            return {
                title: $t({defaultMessage: "This user does not exist!"}),
            };
        }
        case "group-pm-with": {
            const person_in_group_pm = people.get_by_email(first_operand);
            if (!person_in_group_pm) {
                return {
                    title: $t({defaultMessage: "This user does not exist!"}),
                };
            }
            if (
                page_params.realm_private_message_policy ===
                settings_config.private_message_policy_values.disabled.code
            ) {
                return {
                    title: $t({
                        defaultMessage:
                            "You are not allowed to send group direct messages in this organization.",
                    }),
                };
            }
            return {
                title: $t(
                    {
                        defaultMessage: "You have no group direct messages with {person} yet.",
                    },
                    {person: person_in_group_pm.full_name},
                ),
                html: $t_html(
                    {
                        defaultMessage: "Why not <z-link>start the conversation</z-link>?",
                    },
                    {
                        "z-link": (content_html) =>
                            `<a href="#" class="empty_feed_compose_private">${content_html}</a>`,
                    },
                ),
            };
        }
    }
    return default_banner;
}

export function show_empty_narrow_message() {
    $(".empty_feed_notice_main").empty();
    const rendered_narrow_banner = narrow_error(pick_empty_narrow_banner());
    $(".empty_feed_notice_main").html(rendered_narrow_banner);
}

export function hide_empty_narrow_message() {
    $(".empty_feed_notice_main").empty();
}
