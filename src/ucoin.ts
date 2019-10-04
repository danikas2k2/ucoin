// ==UserScript==
// @name         collector :: ucoin.net
// @namespace    https://ucoin.net/
// @version      [AIV]{version}[/AIV]
// @author       danikas2k2
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABuUlEQVQokS2Qv4pfZQBEz8x3d8kWVtEuwVSSIo1d+gTLgM8QSYiQEK0Ci90mvSD2guRNFN/AhMRCMIHdRcE/u79i7zdjcfcBZs7M0RdPn9KhGpeUVHt7ySoJDGGNFmYsTUseNVCxak5HC3NeSALWZG1Y3NZIddslIqDMvULapmOZ1EWXVWnCUIu9LGtZpI+ufnj0zTOgcPj8xcmff4nc+uTmk4cPhikcHr04OT1N4kVuK1dCrWEgzxagw5AKAGlEXlRkzwZSSWLNlGSNpABWEqYcS1lC06KtBUB2xZqJVUgz7IoKrMUBY4laoi0YsDGoDEzBqkJxh9rZiMulFQHAc85NE2Jjga1ie/NDECzdlE9JtEBKmShSHZSw2+1KN8j+wZXpqB4YqYnobndue1aua/vs7Oz1m9+2wOf37plZ5c5ndxGyX719c36+m0GS7n/1tSKVGx9fe/zoyw8O9knR5aW2/+3Wb7//7vc/3m0Ox6e3b1tQ/f3Pv7++foV1/fo1SaRFP/38yw8/vnx/fMxYaFQ2QoeW2YhIgs6m8kBtpdHOVmOMzlgpkCSieIbGeM81GWa0qmU788Lq/6iyH9ZvXMLcAAAAAElFTkSuQmCC
// @downloadURL  https://raw.githubusercontent.com/danikas2k2/tampermonkey-ucoin/master/dist/ucoin.user.js
// @updateURL    https://raw.githubusercontent.com/danikas2k2/tampermonkey-ucoin/master/dist/ucoin.user.js
// @match        https://*.ucoin.net/*
// @run-at       document-end
// ==/UserScript==


// @ts-ignore
import style from '../styles/ucoin.less';

import {addBuyDateResetButton, addPublicityToggle, addReplacementToggle, addSyncConditionToColorTable, updateFormStyles} from './lib/coin-form';
import {addGalleryVisibilityToggle} from './lib/gallery';
import {updateLinkHref, updateOnClickHref} from './lib/links';
import {estimateSwapPrices} from './lib/prices';
import {addSwapButtons, addSwapColorMarkers, addSwapComments, addSwapFormQtyButtons, styleSwapLists} from './lib/swap-form';
import {
    addConflictHandling,
    addOpenedTabsHandler,
    addTrackingLinks,
    checkSold,
    duplicatePagination,
    ignoreUnwanted,
    removeRowHrefFromSwapList,
    showAllPrices
} from './lib/swap-list';
import {addSortingOptions} from './lib/swap-list-sort';
import {UID} from './lib/uid';
import {addWishColorMarkers, styleWishLists} from './lib/wish-form';

document.head.insertAdjacentHTML('beforeend', `<style type="text/css">${style}</style>`);

async function handleHomePage(loc: string) {
    const profile = document.getElementById('profile');
    const curPrice = profile.querySelector<HTMLDivElement>('div.worth-cur-value span');
    const colPrice = +curPrice.textContent.replace(/[^\d.]/g, '');
    const swapPrice = +profile.querySelector(`a[href="/swap-list/?uid=${UID}"] span.right`).textContent.replace(/[^\d.]/g, '');
    const price = colPrice + swapPrice;
    curPrice.classList.add('price');
    curPrice.insertAdjacentHTML('beforeend', `<br/><small class="total"><abbr class="cur">€</abbr> ${
        new Intl.NumberFormat('en').format(price)
    }</small>`);
}

async function handleCoinPage(loc: string) {
    const tags = document.getElementById('tags');
    if (tags) {
        // fixTagLinks
        const galleryLinks = <NodeListOf<HTMLAnchorElement>> tags.querySelectorAll('a[href^="/gallery/"]');
        for (const a of galleryLinks) {
            updateLinkHref(a);
        }
    }

    addBuyDateResetButton();
    addSyncConditionToColorTable();

    if (loc.includes('ucid=')) {
        updateFormStyles();
        addPublicityToggle();
        addReplacementToggle();
    }

    const mySwap = document.getElementById('my-swap-block');
    if (mySwap && mySwap.querySelector('#swap-block')) {
        addSwapFormQtyButtons();
        addSwapColorMarkers();
        addSwapComments();
        await addSwapButtons();
    }
    styleSwapLists();

    const theySwap = document.getElementById('swap');
    if (theySwap && theySwap.nextElementSibling.id === 'swap-block') {
        estimateSwapPrices();
    }

    const myWish = document.getElementById('my-wish-block');
    if (myWish && myWish.querySelector('#wish-block')) {
        addWishColorMarkers();
        styleWishLists();
    }
}

async function handleGalleryPage() {
    const gallery = document.getElementById('gallery');
    if (gallery) {
        // fix gallery links
        const galleryLinks = <NodeListOf<HTMLAnchorElement>> gallery.querySelectorAll('a[href^="/gallery/"]');
        for (const a of galleryLinks) {
            updateLinkHref(a);
        }
        const queryLinks = <NodeListOf<HTMLAnchorElement>> gallery.querySelectorAll('a[href^="?"]');
        for (const a of queryLinks) {
            updateLinkHref(a);
        }
        const closeButtons = <NodeListOf<HTMLDivElement>> gallery.querySelectorAll('div.close');
        for (const div of closeButtons) {
            updateOnClickHref(div);
        }
    }

    addGalleryVisibilityToggle();
}

async function handleSwapPage() {
    addTrackingLinks();
    addOpenedTabsHandler();
    addSortingOptions();
    duplicatePagination();
    showAllPrices();
    addConflictHandling();
    checkSold();
    ignoreUnwanted();
    removeRowHrefFromSwapList();

    const tree = <HTMLDivElement> document.getElementById('tree');
    if (tree) {
        const filterLinks = tree.querySelectorAll<HTMLAnchorElement>('.filter-container .list-link');
        for (const a of filterLinks) {
            updateLinkHref(a);
        }

        const filterBoxes = tree.querySelectorAll<HTMLDivElement>('.filter-container .filter-box-active');
        for (const filter of filterBoxes) {
            const name = filter.getAttribute('id').replace(/-filter/, '');
            const div = filter.querySelector<HTMLDivElement>('.close');
            if (div) {
                updateOnClickHref(div, [name]);
            }
        }
    }
}

(async function () {
    const loc = document.location.href;

    if (loc.includes(`/uid${UID}`)) {
        await handleHomePage(loc);
    }

    if (loc.includes('/coin')) {
        await handleCoinPage(loc);
    }

    if (loc.includes('/gallery') && loc.includes(`uid=${UID}`)) {
        await handleGalleryPage();
    }

    if (loc.includes('/swap-')) {
        await handleSwapPage();
    }
})();
