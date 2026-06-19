/**
 * Interactive grid editor for the table template.
 * Replaces the pipe-separated text inputs with a live editable table.
 * Serializes to/from the same `headers` / `rows` pipe format so the
 * existing render() function and collectData() need no changes.
 */

export function initTableGridEditor(container: HTMLElement): void {
  const hiddenHeaders = container.querySelector<HTMLInputElement>('[name="headers"]');
  const hiddenRows    = container.querySelector<HTMLInputElement>('[name="rows"]');
  if (!hiddenHeaders || !hiddenRows) return;

  const state = parseGrid(hiddenHeaders.value, hiddenRows.value);
  renderGrid(container, state, hiddenHeaders, hiddenRows);
}

// ── Parse / serialize ────────────────────────────────────────────────

interface GridState {
  headers: string[];
  rows:    string[][];
}

function parseGrid(headersSrc: string, rowsSrc: string): GridState {
  let headers = headersSrc.split('|').map(h => h.trim());
  if (!headers.some(Boolean)) headers = ['Στήλη 1'];

  const rows = rowsSrc
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.split('|').map(c => c.trim()));

  const cols = Math.max(headers.length, ...rows.map(r => r.length), 1);

  while (headers.length < cols) headers.push('');
  const paddedRows = rows.map(r => {
    while (r.length < cols) r.push('');
    return r;
  });

  return { headers, rows: paddedRows };
}

function serializeGrid(state: GridState): { headers: string; rows: string } {
  return {
    headers: state.headers.join(' | '),
    rows:    state.rows.map(r => r.join(' | ')).join('\n'),
  };
}

// ── Render ───────────────────────────────────────────────────────────

function renderGrid(
  container: HTMLElement,
  state: GridState,
  hiddenHeaders: HTMLInputElement,
  hiddenRows:    HTMLInputElement,
): void {
  let grid = container.querySelector<HTMLElement>('.nb-tgrid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'nb-tgrid';
    container.appendChild(grid);
  }

  const cols = state.headers.length;

  function onChange() {
    const vals = serializeGrid(state);
    hiddenHeaders.value = vals.headers;
    hiddenRows.value    = vals.rows;
  }

  function makeCell(value: string, isHeader: boolean, row: number, col: number): HTMLTableCellElement {
    const td = document.createElement(isHeader ? 'th' : 'td');
    td.className = 'nb-tgrid-td';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'nb-tgrid-input' + (isHeader ? ' nb-tgrid-input--header' : '');
    input.value = value;
    input.placeholder = isHeader ? `Επικεφαλίδα ${col + 1}` : '';

    input.addEventListener('input', () => {
      if (isHeader) state.headers[col] = input.value;
      else          state.rows[row][col] = input.value;
      onChange();
    });

    // Tab moves to next cell
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        const allInputs = Array.from(grid!.querySelectorAll<HTMLInputElement>('.nb-tgrid-input'));
        const idx = allInputs.indexOf(input);
        if (idx >= 0 && idx < allInputs.length - 1) {
          e.preventDefault();
          allInputs[idx + 1].focus();
        }
      }
    });

    td.appendChild(input);
    return td;
  }

  function rebuild() {
    grid!.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'nb-tgrid-table';

    // ── Header row ───────────────────────────────────────────────
    const thead = document.createElement('thead');
    const hRow  = document.createElement('tr');

    // "delete column" buttons row (above headers)
    const colBtnsRow = document.createElement('tr');
    colBtnsRow.className = 'nb-tgrid-colbtns';

    // corner cell
    colBtnsRow.appendChild(emptyTd());

    state.headers.forEach((h, col) => {
      hRow.appendChild(makeCell(h, true, -1, col));

      // delete col button
      const td = document.createElement('td');
      td.className = 'nb-tgrid-ctrl-cell';
      if (cols > 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nb-tgrid-del-col';
        btn.title = 'Διαγραφή στήλης';
        btn.textContent = '×';
        btn.addEventListener('click', () => {
          state.headers.splice(col, 1);
          state.rows.forEach(r => r.splice(col, 1));
          onChange();
          rebuild();
        });
        td.appendChild(btn);
      }
      colBtnsRow.appendChild(td);
    });

    // add-col button (last col header cell)
    const addColTh = document.createElement('th');
    addColTh.className = 'nb-tgrid-ctrl-cell';
    const addColBtn = document.createElement('button');
    addColBtn.type = 'button';
    addColBtn.className = 'btn btn-xs btn-ghost nb-tgrid-add-col';
    addColBtn.title = 'Προσθήκη στήλης';
    addColBtn.textContent = '+';
    addColBtn.addEventListener('click', () => {
      state.headers.push('');
      state.rows.forEach(r => r.push(''));
      onChange();
      rebuild();
      // Focus new header input
      const inputs = grid!.querySelectorAll<HTMLInputElement>('.nb-tgrid-input--header');
      inputs[inputs.length - 1]?.focus();
    });
    addColTh.appendChild(addColBtn);

    colBtnsRow.appendChild(addColTh);
    hRow.appendChild(emptyTd()); // ctrl column placeholder

    thead.appendChild(colBtnsRow);
    thead.appendChild(hRow);
    table.appendChild(thead);

    // ── Data rows ─────────────────────────────────────────────────
    const tbody = document.createElement('tbody');

    state.rows.forEach((rowData, rowIdx) => {
      const tr = document.createElement('tr');

      rowData.forEach((cell, col) => {
        tr.appendChild(makeCell(cell, false, rowIdx, col));
      });

      // delete-row button
      const delTd = document.createElement('td');
      delTd.className = 'nb-tgrid-ctrl-cell';
      if (state.rows.length > 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nb-tgrid-del-row';
        btn.title = 'Διαγραφή γραμμής';
        btn.textContent = '×';
        btn.addEventListener('click', () => {
          state.rows.splice(rowIdx, 1);
          onChange();
          rebuild();
        });
        delTd.appendChild(btn);
      }
      tr.appendChild(delTd);
      tbody.appendChild(tr);
    });

    // ── Add-row button ────────────────────────────────────────────
    const addRowTr = document.createElement('tr');
    const addRowTd = document.createElement('td');
    addRowTd.colSpan = cols + 1;
    addRowTd.className = 'nb-tgrid-addrow-cell';
    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button';
    addRowBtn.className = 'btn btn-xs btn-ghost nb-tgrid-add-row';
    addRowBtn.textContent = '+ Γραμμή';
    addRowBtn.addEventListener('click', () => {
      state.rows.push(Array(cols).fill(''));
      onChange();
      rebuild();
      // Focus first cell of new row
      const tds = grid!.querySelectorAll<HTMLInputElement>('tbody .nb-tgrid-input');
      tds[tds.length - cols]?.focus();
    });
    addRowTd.appendChild(addRowBtn);
    addRowTr.appendChild(addRowTd);
    tbody.appendChild(addRowTr);

    table.appendChild(tbody);
    grid!.appendChild(table);
  }

  rebuild();
}

function emptyTd(): HTMLElement {
  const td = document.createElement('td');
  td.className = 'nb-tgrid-ctrl-cell';
  return td;
}
