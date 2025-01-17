import $ from 'jquery';
import * as Utils from '../../core/utils';

const selectors = {
  sortSelect: '[data-sort-select]'
};

export default class CollectionSort {
  constructor(container, collectionData) {
    this.$container = $(container);

    this.name = 'collectionSort';
    this.namespace = `.${this.name}`;

    // Stop parsing if we don't have the collectionData data
    if (!collectionData) {
      return;
    }

    this.collectionData = collectionData;

    this.$container.on('change', selectors.sortSelect, this.applySort.bind(this));
  }

  applySort() {
    const sortBy = $(selectors.sortSelect, this.container).find('option:selected').val();
    const queryParams = Utils.getQueryParams();

    queryParams.sort_by = sortBy;

    window.location.search = $.param(queryParams);
  }
}
