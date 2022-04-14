import { Filter, FilterOptions, FilterProps, renderFilters } from './filters';
import { c, cmp, d, num, sortField, x } from './sort';
import { getHashParam, updateLocationHash } from './url';
import { cancel } from './utils';

export function addFilteringOptions(): void {
    const swapList = document.getElementById('take-swap-list') as HTMLDivElement;
    if (!swapList) {
        return;
    }

    const dataList = swapList.lastElementChild as HTMLDivElement;
    if (!dataList) {
        return;
    }

    function sort(data: FilterOptions, cmp?: (a: string, b: string) => number): FilterOptions {
        return [...data.keys()].sort(cmp).reduce((r: FilterOptions, k) => {
            const value = data.get(k);
            if (value) {
                r.set(k, value);
            }
            return r;
        }, new Map());
    }

    // TODO add number of available results for every filter option
    // TODO disable unavailable/hidden filter options or event whole filter for single option
    // TODO render filters on the fly
    // TODO add more advance filter dialogs for years (columns, ranges), values (columns, ranges), km (columns, masks)

    const filterProps = new Map<Filter, FilterProps>();

    const countryHeadings = swapList.querySelectorAll('h2');
    filterProps.set(Filter.COUNTRY, {
        placeholder: 'Country',
        width: 250,
        options: sort(
            [...countryHeadings].reduce((r: FilterOptions, h) => {
                const hc = h.cloneNode(true) as HTMLHeadingElement;
                for (const el of hc.querySelectorAll('input, sup')) {
                    el.remove();
                }
                r.set(hc.id, hc.innerHTML);
                return r;
            }, new Map()),
        ),
    });

    filterProps.set(Filter.YEAR, {
        placeholder: 'Year',
        width: 90,
        options: sort(
            [...swapList.querySelectorAll<HTMLTableRowElement>('tr[data-sort-year]')].reduce((r: FilterOptions, o) => {
                const y = o.dataset.sortYear;
                if (y) {
                    r.set(y, y);
                }
                return r;
            }, new Map()),
            (a, b) => cmp(num(b), num(a)),
        ),
    });

    filterProps.set(Filter.VALUE, {
        placeholder: 'Face value',
        width: 110,
        options: sort(
            [...swapList.querySelectorAll<HTMLTableRowElement>('tr[data-sort-face]')].reduce((r: FilterOptions, o) => {
                const f = o.dataset.sortFace;
                if (f) {
                    const [v] = f.split(' ');
                    r.set(v, v);
                }
                return r;
            }, new Map()),
            (a, b) => cmp(num(a), num(b)),
        ),
    });

    const kmMatch = /([a-z]*)([0-9]*)((?:\.[0-9]+)?[a-z]*)/i;

    filterProps.set(Filter.KM, {
        placeholder: 'KM#',
        width: 110,
        options: sort(
            [...swapList.querySelectorAll<HTMLTableRowElement>('tr[data-sort-km]')].reduce((r: FilterOptions, o) => {
                const { sortKmc: c = '', sortKm: k = '', sortKma: a = '' } = o.dataset;
                const v = `${c.toLowerCase()}${k}${a}`;
                if (v) {
                    r.set(v, `${c}# ${k}${a}`);
                }
                return r;
            }, new Map()),
            (a, b) => {
                const [, ac, ak, aa] = a.match(kmMatch) || [];
                const [, bc, bk, ba] = b.match(kmMatch) || [];
                return cmp(ac, bc) || cmp(num(ak), num(bk)) || cmp(aa, ba);
            },
        ),
    });

    const filterNames = Object.values(Filter);
    const filterValues = new Map<Filter, string>();
    for (const filter of filterNames) {
        const value = getHashParam(filter);
        if (value) {
            filterValues.set(filter, value);
            const props = filterProps.get(filter);
            if (props) {
                props.value = value;
            }
        }
    }

    dataList.insertAdjacentHTML('beforebegin', renderFilters(filterProps));

    function applyFilters() {
        for (const h of countryHeadings) {
            const t = h.nextElementSibling as HTMLTableElement;
            const rows = t.querySelectorAll('tr');

            let hasVisibleRows = false;

            rowLoop: for (const r of rows) {
                const d = r.dataset;
                for (const [filter, value] of filterValues) {
                    switch (filter) {
                        case Filter.COUNTRY:
                            if (h.id !== value) {
                                hasVisibleRows = false;
                                break rowLoop;
                            }
                            break;

                        case Filter.YEAR:
                            if (d.sortYear !== value) {
                                r.style.display = 'none';
                                continue rowLoop;
                            }
                            break;

                        case Filter.VALUE:
                            if (!d.sortFace?.startsWith(`${value} `)) {
                                r.style.display = 'none';
                                continue rowLoop;
                            }
                            break;

                        case Filter.KM:
                            const [, c, k, a] = value.match(kmMatch) || [];
                            if (d.sortKmc?.toLowerCase() !== c || d.sortKm !== k || d.sortKma !== a) {
                                r.style.display = 'none';
                                continue rowLoop;
                            }
                            break;
                    }
                }

                // no filter applied
                r.style.display = '';
                hasVisibleRows = true;
            }

            h.style.display = t.style.display = hasVisibleRows ? '' : 'none';
        }
    }

    applyFilters();

    for (const option of document.querySelectorAll<HTMLElement>('[data-filter-by]')) {
        option.addEventListener('click', async () => {
            const ds = option.dataset;
            const filter = ds.filterBy as Filter;
            const value = ds.filterValue;
            await updateLocationHash((params) => (value ? params.set(filter, value) : params.delete(filter)));

            const display = document.querySelector<HTMLElement>(`[data-filter="${filter}"]`);
            if (display) {
                if (value) {
                    display.innerHTML = `${c(option.innerHTML)}${x(filter)}`;
                    display.classList.add('filter-box-active');
                } else {
                    display.innerHTML = `${c(display.dataset?.filterPlaceholder)}${d()}`;
                    display.classList.remove('filter-box-active');
                }
            }

            value ? filterValues.set(filter as Filter, value) : filterValues.delete(filter as Filter);
            applyFilters();
        });
    }

    document.querySelectorAll<HTMLElement>('[data-filter]').forEach((display) =>
        display.addEventListener('click', async (e) => {
            cancel(e);
            const ds = display.dataset;
            if (ds.filterDisabled != null) {
                return;
            }

            let clearClicked = false;
            const button = e.target as HTMLElement;
            const filter = ds.filter as Filter;
            if (button.matches('[data-filter-clear]')) {
                clearClicked = true;
                const { filterClear } = button.dataset;
                if (filterClear) {
                    await updateLocationHash((params) => params.delete(filterClear));
                }
                display.innerHTML = `${c(ds.filterPlaceholder)}${d()}`;
                display.classList.remove('filter-box-active');
                filterValues.delete(filter);
                applyFilters();
            }

            for (const dialog of document.querySelectorAll<HTMLElement>(`[data-filter-dialog]`)) {
                dialog.style.display =
                    !clearClicked && dialog.dataset.filterDialog === filter && dialog.style.display !== 'block'
                        ? 'block'
                        : 'none';
            }
        }),
    );

    document.querySelectorAll<HTMLElement>('[data-filter-dialog]').forEach((dialog) =>
        dialog.addEventListener('click', (e) => {
            cancel(e);
            dialog.style.display = 'none';
        }),
    );

    const filters = swapList.querySelectorAll<HTMLInputElement>('.filter');
    for (const filter of filters) {
        filter.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const id = target.id;
            const value = target.value;
            const name = sortField(id);
            const rows = swapList.querySelectorAll<HTMLTableRowElement>('tbody > tr');
            for (const row of rows) {
                const d = row.dataset;
                row.style.display = !value || d[name]?.includes(value) ? '' : 'none';
            }
        });
    }

    const sections = swapList.querySelectorAll<HTMLTableSectionElement>('table.swap-coin tbody');
    if (!sections || !sections.length) {
        return;
    }
}
