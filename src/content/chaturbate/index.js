import 'babel-polyfill';
import * as Storage from '../../common/storage';

Storage.init({ id: 'content/chaturbate '});

import './common/port';
import './common/messages';
import './common/broadcast';

import './account-activity';
import './tipper-info';
import './translator-in';
import './translator-out';
