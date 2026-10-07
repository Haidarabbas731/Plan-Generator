import Message from './core/message.svelte';
import MessageContent from './core/message-content.svelte';
import MessageActions from './actions/message-actions.svelte';
import MessageAction from './actions/message-action.svelte';
import MessageToolbar from './actions/message-toolbar.svelte';
import MessageResponse from './response/message-response.svelte';

export * from './context/message-context.svelte.js';

export {
	Message,
	MessageContent,
	MessageActions,
	MessageAction,
	MessageToolbar,
	MessageResponse,

	// Aliases
	Message as Root,
	MessageContent as Content,
	MessageActions as Actions,
	MessageAction as Action,
	MessageToolbar as Toolbar,
	MessageResponse as Response
};
