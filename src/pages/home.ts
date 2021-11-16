import { UID } from '../lib/uid';

export async function handleHomePage(): Promise<void> {
    const profile = document.getElementById('profile');
    if (profile) {
        const curPriceElement = profile.querySelector<HTMLDivElement>('div.worth-cur-value span');
        if (curPriceElement) {
            const colPrice = +curPriceElement.textContent!.replace(/[^\d.]/g, '');
            const swapPriceElement = profile.querySelector(`a[href="/swap-list/?uid=${UID}"] span.right`);
            if (swapPriceElement) {
                const swapPrice = +swapPriceElement.textContent!.replace(/[^\d.]/g, '');
                const price = colPrice + swapPrice;
                curPriceElement.classList.add('price');
                curPriceElement.insertAdjacentHTML(
                    'beforeend',
                    `<br/><small class='total'><abbr class='cur'>€</abbr> ${new Intl.NumberFormat('en').format(
                        price
                    )}</small>`
                );
            }
        }
    }
}
