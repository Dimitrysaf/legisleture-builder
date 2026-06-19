import type { Template } from '../types';

export const finalArticleTemplate: Template = {
  id: 'final-article',
  name: 'Έναρξη Ισχύος',
  icon: 'calendar-check',
  description: 'Τελικό άρθρο — έναρξη ισχύος νόμου',
  category: 'structure',
  fields: [
    { id: 'body', label: 'Περιεχόμενο', type: 'container' },
  ],
  render(_data) {
    return `<div class="nb-block nb-block--final-article" data-template="final-article">
  <div class="nb-struct-heading nb-struct-heading--article">
    <span class="nb-struct-title">Έναρξη Ισχύος</span>
  </div>
  <div class="nb-container-zone nb-article-body" data-container-for="body"></div>
</div>`;
  },
};
