import { USER_ROLES } from '@tindak/shared';
import { runPromoteScript } from './promote.js';

await runPromoteScript(USER_ROLES.ADMIN, 'make-admin');
