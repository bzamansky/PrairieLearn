import TomSelect from 'tom-select';

import { onDocumentReady } from '@prairielearn/browser-utils';
import { html } from '@prairielearn/html';

import { TagBadge } from '../../src/components/TagBadge.js';
import { TopicBadgeHtml } from '../../src/components/TopicBadge.js';
import { type Tag, type Topic } from '../../src/lib/db-types.js';
import { renderHtml } from '../../src/lib/preact-html.js';

import { saveButtonEnabling } from './lib/saveButtonEnabling.js';
import { validateId } from './lib/validateId.js';

onDocumentReady(() => {
  const qidField = document.querySelector<HTMLInputElement>('input[name="qid"]')!;
  const otherQids = qidField.dataset.otherValues?.split(',') ?? [];
  const questionSettingsForm = document.querySelector<HTMLFormElement>(
    'form[name="edit-question-settings-form"]',
  );
  const saveButton = document.querySelector<HTMLButtonElement>('#save-button');
  const showWorkspaceOptionsButton = document.querySelector<HTMLButtonElement>(
    '#show-workspace-options-button',
  );
  const workspaceOptions = document.querySelector<HTMLDivElement>('#workspace-options');
  const workspaceImageInput = document.querySelector<HTMLInputElement>('#workspace_image');
  const workspacePortInput = document.querySelector<HTMLInputElement>('#workspace_port');
  const workspaceHomeInput = document.querySelector<HTMLInputElement>('#workspace_home');
  const workspaceEnvironmentInput =
    document.querySelector<HTMLInputElement>('#workspace_environment');

  let workspaceOptionsShown = showWorkspaceOptionsButton?.getAttribute('hidden') === 'true';

  function updateWorkspaceOptionsValidation() {
    if (workspaceOptionsShown) {
      workspaceImageInput?.setAttribute('required', 'true');
      workspacePortInput?.setAttribute('required', 'true');
      workspaceHomeInput?.setAttribute('required', 'true');
    } else {
      workspaceImageInput?.removeAttribute('required');
      workspacePortInput?.removeAttribute('required');
      workspaceHomeInput?.removeAttribute('required');
    }
  }

  if (document.getElementById('topic')) {
    new TomSelect('#topic', {
      valueField: 'name',
      searchField: ['name', 'description'],
      closeAfterSelect: true,
      plugins: ['no_backspace_delete'],
      maxItems: 1,
      render: {
        option(data: Topic) {
          return html`
            <div>
              ${TopicBadgeHtml(data)}
              <div>
                <small>${data.description}</small>
              </div>
            </div>
          `.toString();
        },
        item(data: Topic) {
          return TopicBadgeHtml(data).toString();
        },
      },
    });
  }

  if (document.getElementById('tags')) {
    new TomSelect('#tags', {
      valueField: 'name',
      searchField: ['name', 'description'],
      plugins: ['remove_button'],
      render: {
        option(data: Tag) {
          return html`
            <div>
              ${renderHtml(<TagBadge tag={data} />)}
              <div>
                <small>${data.description}</small>
              </div>
            </div>
          `.toString();
        },
        item(data: Tag) {
          return html`<span class="badge color-${data.color} me-1">${data.name}</span>`.toString();
        },
      },
    });
  }

  qidField.addEventListener('input', () => validateId({ input: qidField, otherIds: otherQids }));
  qidField.addEventListener('change', () => validateId({ input: qidField, otherIds: otherQids }));

  workspaceEnvironmentInput?.addEventListener('input', (e) => {
    if ((e.target as HTMLInputElement).value === '') {
      workspaceEnvironmentInput?.setCustomValidity('');
      return;
    }
    try {
      const value = JSON.parse((e.target as HTMLInputElement).value);
      if (typeof value !== 'object' || Array.isArray(value)) {
        workspaceEnvironmentInput?.setCustomValidity('Invalid JSON object format');
      } else {
        workspaceEnvironmentInput?.setCustomValidity('');
      }
      return;
    } catch {
      workspaceEnvironmentInput?.setCustomValidity('Invalid JSON object format');
    }
  });

  if (questionSettingsForm && saveButton) {
    saveButtonEnabling(questionSettingsForm, saveButton);
  }

  updateWorkspaceOptionsValidation();
  showWorkspaceOptionsButton?.addEventListener('click', () => {
    workspaceOptions?.removeAttribute('hidden');
    showWorkspaceOptionsButton.setAttribute('hidden', 'true');
    workspaceOptionsShown = true;
    updateWorkspaceOptionsValidation();
  });

  questionSettingsForm?.addEventListener('submit', (e) => {
    if (!questionSettingsForm.checkValidity()) {
      e.preventDefault();
      questionSettingsForm.reportValidity();
    }
  });
  const addAuthorButton = document.querySelector<HTMLButtonElement>('#add-author-button');
  const table = document.getElementById('author-table-body');
  const rows = table?.getElementsByClassName('author-row');
  const numRows = rows?.length ?? 0;
  addAuthorButton?.addEventListener('click', () => {
    const newRow = document.createElement('tr');
    newRow.setAttribute('class', 'author-row');
    newRow.setAttribute('id', 'author_row_' + numRows);
    let tableData = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.setAttribute('type', 'text');
    nameInput.setAttribute('class', 'form-control font-monospace');
    nameInput.setAttribute('id', 'author_name_' + numRows);
    nameInput.setAttribute('name', 'author_name_' + numRows);
    tableData.appendChild(nameInput);
    newRow.appendChild(tableData);

    tableData = document.createElement('td');
    const emailInput = document.createElement('input');
    emailInput.setAttribute('type', 'text');
    emailInput.setAttribute('class', 'form-control font-monospace');
    emailInput.setAttribute('id', 'author_email_' + numRows);
    emailInput.setAttribute('name', 'author_email_' + numRows);
    tableData.appendChild(emailInput);
    newRow.appendChild(tableData);

    tableData = document.createElement('td');
    const orcidInput = document.createElement('input');
    orcidInput.setAttribute('type', 'text');
    orcidInput.setAttribute('class', 'form-control font-monospace');
    orcidInput.setAttribute('id', 'author_orcid_' + numRows);
    orcidInput.setAttribute('name', 'author_orcid_' + numRows);
    tableData.appendChild(orcidInput);
    newRow.appendChild(tableData);

    tableData = document.createElement('td');
    const originCourseInput = document.createElement('input');
    originCourseInput.setAttribute('type', 'text');
    originCourseInput.setAttribute('class', 'form-control font-monospace');
    originCourseInput.setAttribute('id', 'author_origin_course_' + numRows);
    originCourseInput.setAttribute('name', 'author_origin_course_' + numRows);
    tableData.appendChild(originCourseInput);
    newRow.appendChild(tableData);

    tableData = document.createElement('td');
    const removeData = document.createElement('button');
    removeData.setAttribute('type', 'button');
    removeData.setAttribute('class', 'btn btn-secondary mb-2');
    removeData.setAttribute('id', 'remove_author_' + numRows);
    removeData.innerText = 'Remove';
    removeData?.addEventListener('click', () => {
      const rowToRemove = document.querySelector<HTMLTableRowElement>('#author_row_' + numRows);
      rowToRemove?.remove();
      if (questionSettingsForm && saveButton) {
        saveButton.setAttribute('disabled', 'false');
      }
    });
    tableData.appendChild(removeData);
    newRow.appendChild(tableData);

    table?.appendChild(newRow);
  });

  for (let index = 0; index < numRows; index++) {
    const removeAuthorButton = document.querySelector<HTMLButtonElement>('#remove_author_' + index);
    removeAuthorButton?.addEventListener('click', () => {
      const rowToRemove = document.querySelector<HTMLTableRowElement>('#author_row_' + index);
      rowToRemove?.remove();
      if (questionSettingsForm && saveButton) {
        saveButton.setAttribute('disabled', 'false');
      }
    });
  }
});
