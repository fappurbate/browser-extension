import axios from 'axios';
import * as WS from './common/ws';
import * as Storage from './storage';
import { playAudio } from '../common/util';

WS.events.addEventListener('play-audio', async event => {
  const { id } = event.detail;

  const { backend } = await Storage.get(['backend']);

  const { data: metadata } = await axios.get(`${backend}/api/gallery/${id}/metadata`);
  const { data: content } = await axios.get(`${backend}/api/gallery/${id}?encoding=base64`);

  const dataURL = `data:${metadata.mime};base64,${content}`;
  playAudio(dataURL);
});
