import $ from 'jquery';
import * as Utils from '../../core/utils';
import * as Currency from '../../core/currency';
import Variants from './variants';
import * as Breakpoints from '../../core/breakpoints';

const selectors = {
  addToCart: '[data-add-to-cart]',
  addToCartText: '[data-add-to-cart-text]',
  comparePrice: '[data-compare-price]',
  comparePriceText: '[data-compare-text]',
  originalSelectorId: '[data-product-select]',
  priceWrapper: '[data-price-wrapper]',
  productJson: '[data-product-json]',
  productPrice: '[data-product-price]',
  singleOptionSelector: '[data-single-option-selector]',
  variantOptionValueList: '[data-variant-option-value-list][data-option-position]',
  variantOptionValue: '[data-variant-option-value]',
  quantitySelect: '[data-product-quantity-select]',
  fullDetailsLink: '[data-full-details-link]',
  variantName: '[data-variant-name]',
  bvReviewsNumber: '.bv_numReviews_text',
  reviewsSummary: '#avg-rating-button',
  reviewFull: '.bv_button_buttonFull',
  reviewsAccordion: '#review-collapse',
  bvReviews: '[data-bv-reviews]',
  drawerItem: '.spec-tabs .collapse'
};

const classes = {
  hide: 'hide',
  variantOptionValueActive: 'is-active'
};

export default class ProductDetailForm {
  /**
   * ProductDetailForm constructor
   *
   * @param { Object } config
   * @param { jQuery } config.$container - Main element, see snippets/product-detail-form.liquid
   * @param { Function } config.onVariantChange -  Called when a new variant has been selected from the form,
   * @param { Boolean } config.enableHistoryState - If set to "true", turns on URL updating when switching variant
   */
  constructor(config) {
    this.settings = {};
    this.name = 'productDetailForm';
    this.namespace = `.${this.name}`;

    this.events = {
      RESIZE: `resize${this.namespace}`,
      CLICK:  `click${this.namespace}`
    };

    const defaults = {
      $container: null,
      onVariantChange: $.noop,
      enableHistoryState: true
    };

    this.settings = $.extend({}, defaults, config);

    if (!this.settings.$container || this.settings.$container.length === 0) {
      console.warn(`[${this.name}] - config.$container required to initialize`);
      return;
    }

    /* eslint-disable */
    /* temporarily disable to allow long lines for element descriptions */
    this.$container              = this.settings.$container; // Scoping element for all DOM lookups
    this.$quantitySelect         = $(selectors.quantitySelect, this.$container); // Quantity dropdown
    this.$fullDetailsLink        = $(selectors.fullDetailsLink, this.$container); // Inside quickview, link that points back to the full product
    this.$addToCartBtn           = $(selectors.addToCart, this.$container);
    this.$addToCartBtnText       = $(selectors.addToCartText, this.$container); // Text inside the add to cart button
    this.$priceWrapper           = $(selectors.priceWrapper, this.$container); // Contains all price elements
    this.$productPrice           = $(selectors.productPrice, this.$container);
    this.$comparePrice           = $(selectors.comparePrice, this.$container);
    this.$compareEls             = this.$comparePrice.add($(selectors.comparePriceText, this.$container));
    this.$singleOptionSelectors  = $(selectors.singleOptionSelector, this.$container); // Dropdowns for each variant option containing all values for that option
    this.$variantOptionValueList = $(selectors.variantOptionValueList, this.$container); // Alternate UI that takes the place of a single option selector (could be swatches, dots, buttons, whatever..)
    this.$variantName            = $(selectors.variantName, this.$container);
    /* eslint-enable */

    this.productSingleObject  = JSON.parse($(selectors.productJson, this.$container).html());

    this.variants = new Variants({
      $container: this.$container,
      enableHistoryState: this.settings.enableHistoryState,
      singleOptionSelector: selectors.singleOptionSelector,
      originalSelectorId: selectors.originalSelectorId,
      product: this.productSingleObject
    });

    this.$container.on('variantChange', this.onVariantChange.bind(this));
    this.$container.on(this.events.CLICK, selectors.variantOptionValue, this.onVariantOptionValueClick.bind(this));

    $(document).on(this.events.CLICK, selectors.bvReviewsNumber, this.openReviewsAccordion.bind(this));
    $(document).on(this.events.CLICK, selectors.reviewsSummary, this.openReviewsAccordion.bind(this));
    $(document).on(this.events.CLICK, selectors.reviewFull, this.openReviewsAccordion.bind(this));
    $(document).on(this.events.CLICK, selectors.reviewFull, this.openReviewsAccordion.bind(this));
    $(selectors.drawerItem).on('shown.bs.collapse', this.onDrawerOpen.bind(this));

    Utils.chosenSelects(this.$container);
  }

  onDrawerOpen(e) {
    const $drawer = $(e.currentTarget);
    const offsetTop = $drawer.offset().top - $('.header').outerHeight() - $('.product-sticky-bar').outerHeight();
    $('html, body').animate({
      scrollTop: offsetTop
    }, 300);
  }


  openReviewsAccordion() {
    $(selectors.reviewsAccordion).collapse('show');

    $(selectors.reviewsAccordion).on('shown.bs.collapse', () => {
      const reviewsTop = $(selectors.bvReviews).offset().top;
      let headerPadding = 150;

      if ( Breakpoints.getBreakpointMinWidth('lg') < $(window).width() ) {
        headerPadding = 300;
      }

      $('html, body').animate({
        scrollTop: reviewsTop - headerPadding
      }, 300);
    });
  }

  onVariantChange(evt) {
    const variant = evt.variant;

    this.updateProductPrices(variant);
    this.updateAddToCartState(variant);
    this.updateQuantitySelect(variant);
    this.updateVariantOptionValues(variant);
    this.updateFullDetailsLink(variant);

    this.$singleOptionSelectors.trigger('chosen:updated');

    this.settings.onVariantChange(variant);
    //extend code
    window.dispatchEvent(window.Extend.CustomEvent('extendVariantChange', { detail: { event: evt } }));
  }

  /**
   * Updates the DOM state of the add to cart button
   *
   * @param {Object} variant - Shopify variant object
   */
  updateAddToCartState(variant) {
    if (variant) {
      this.$priceWrapper.removeClass(classes.hide);
    }
    else {
      this.$addToCartBtn.prop('disabled', true);
      this.$addToCartBtnText.html(theme.strings.unavailable);
      this.$priceWrapper.addClass(classes.hide);
      return;
    }

    if (variant.available) {
      this.$addToCartBtn.prop('disabled', false);
      this.$addToCartBtnText.html(theme.strings.addToCart);
    }
    else {
      this.$addToCartBtn.prop('disabled', true);
      this.$addToCartBtnText.html(theme.strings.soldOut);
    }
  }

  /**
   * Updates the disabled property of the quantity select based on the availability of the selected variant
   *
   * @param {Object} variant - Shopify variant object
   */
  updateQuantitySelect(variant) {
    // Close the select while we make changes to it
    this.$quantitySelect.trigger('chosen:close');

    this.$quantitySelect.prop('disabled', !(variant && variant.available));

    this.$quantitySelect.trigger('chosen:updated');
  }

  /**
   * Updates the DOM with specified prices
   *
   * @param {Object} variant - Shopify variant object
   */
  updateProductPrices(variant) {
    if (variant) {
      this.$productPrice.html(Currency.formatMoney(variant.price, window.theme.moneyFormat));

      if (variant.compare_at_price > variant.price) {
        this.$comparePrice.html(Currency.formatMoney(variant.compare_at_price, theme.moneyFormat));
        this.$compareEls.removeClass(classes.hide);
      }
      else {
        this.$comparePrice.html('');
        this.$compareEls.addClass(classes.hide);
      }
    }
  }

  /**
   * Updates the DOM state of the elements matching the variantOption Value selector based on the currently selected variant
   *
   * @param {Object} variant - Shopify variant object
   */
  updateVariantOptionValues(variant) {
    if (variant) {
      // Loop through all the options and update the option value
      for (let i = 1; i <= 3; i++) {
        const variantOptionValue = variant[`option${i}`];

        if (!variantOptionValue) break; // Break if the product doesn't have an option at this index

        // Since we are finding the variantOptionValueUI based on the *actual* value, we need to scope to the correct list
        // As some products can have the same values for different variant options (waist + inseam both use "32", "34", etc..)
        const $list = this.$variantOptionValueList.filter(`[data-option-position="${i}"]`);
        const $variantOptionValueUI   = $list.find('[data-variant-option-value="'+variantOptionValue+'"]');

        $variantOptionValueUI.addClass(classes.variantOptionValueActive);
        $variantOptionValueUI.siblings().removeClass(classes.variantOptionValueActive);
      }
    }
  }

  /**
   * Used on quick view, updates the "view full details" link to point to the currently selected variant
   *
   * @param {Object} variant - Shopify variant object
   */
  updateFullDetailsLink(variant) {
    let updatedUrl;

    if (variant && this.$fullDetailsLink.length) {
      updatedUrl = Utils.getUrlWithUpdatedQueryStringParameter('variant', variant.id, this.$fullDetailsLink.attr('href'));
      this.$fullDetailsLink.attr('href', updatedUrl);
    }
  }

  /**
   * Handle variant option value click event.
   * Update the associated select tag and update the UI for this value
   *
   * @param {event} evt
   */
  onVariantOptionValueClick(e) {
    const $option = $(e.currentTarget);

    if ($option.hasClass(classes.variantOptionValueActive)) {
      return;
    }

    const value     = $option.data('variant-option-value');
    const title     = $option.attr('title');
    const position  = $option.parents(selectors.variantOptionValueList).data('option-position');
    const $selector = this.$singleOptionSelectors.filter(`[data-index="option${position}"]`);
    const $optionParent = $option.parents('.selector-wrapper.form-group.js');
    const $variantLabel = $(selectors.variantName, $optionParent);

    $selector.val(value);
    $selector.trigger('change');
    $option.addClass(classes.variantOptionValueActive);
    $option.siblings().removeClass(classes.variantOptionValueActive);
    $variantLabel.text(title);
  }
}
