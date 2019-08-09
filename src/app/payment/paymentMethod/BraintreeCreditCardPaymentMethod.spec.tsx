import { createCheckoutService, CheckoutSelectors, CheckoutService } from '@bigcommerce/checkout-sdk';
import { mount, ReactWrapper } from 'enzyme';
import { Formik } from 'formik';
import { noop } from 'lodash';
import React, { FunctionComponent } from 'react';
import { act } from 'react-dom/test-utils';

import { getCart } from '../../cart/carts.mock';
import { CheckoutProvider } from '../../checkout';
import { getStoreConfig } from '../../config/config.mock';
import { getCustomer } from '../../customer/customers.mock';
import { createLocaleContext, LocaleContext, LocaleContextType } from '../../locale';
import { Modal } from '../../ui/modal';
import { ModalProps } from '../../ui/modal/Modal';
import { getPaymentMethod } from '../payment-methods.mock';
import PaymentContext, { PaymentContextProps } from '../PaymentContext';

import BraintreeCreditCardPaymentMethod, { BraintreeCreditCardPaymentMethodProps } from './BraintreeCreditCardPaymentMethod';
import CreditCardPaymentMethod from './CreditCardPaymentMethod';
import PaymentMethodId from './PaymentMethodId';

describe('when using Braintree payment', () => {
    let BraintreeCreditCardPaymentMethodTest: FunctionComponent<BraintreeCreditCardPaymentMethodProps>;
    let checkoutService: CheckoutService;
    let checkoutState: CheckoutSelectors;
    let defaultProps: BraintreeCreditCardPaymentMethodProps;
    let localeContext: LocaleContextType;
    let paymentContext: PaymentContextProps;

    beforeEach(() => {
        defaultProps = {
            deinitializePayment: jest.fn(),
            initializePayment: jest.fn(),
            isInitializing: false,
            method: {
                ...getPaymentMethod(),
                id: PaymentMethodId.Braintree,
            },
            onUnhandledError: jest.fn(),
        };

        checkoutService = createCheckoutService();
        checkoutState = checkoutService.getState();
        localeContext = createLocaleContext(getStoreConfig());
        paymentContext = {
            disableSubmit: jest.fn(),
            setSubmit: jest.fn(),
            setValidationSchema: jest.fn(),
        };

        jest.spyOn(checkoutState.data, 'getCart')
            .mockReturnValue(getCart());

        jest.spyOn(checkoutState.data, 'getConfig')
            .mockReturnValue(getStoreConfig());

        jest.spyOn(checkoutState.data, 'getCustomer')
            .mockReturnValue(getCustomer());

        jest.spyOn(checkoutService, 'deinitializePayment')
            .mockResolvedValue(checkoutState);

        jest.spyOn(checkoutService, 'initializePayment')
            .mockResolvedValue(checkoutState);

        BraintreeCreditCardPaymentMethodTest = props => (
            <CheckoutProvider checkoutService={ checkoutService }>
                <PaymentContext.Provider value={ paymentContext }>
                    <LocaleContext.Provider value={ localeContext }>
                        <Formik
                            initialValues={ {} }
                            onSubmit={ noop }
                        >
                            <BraintreeCreditCardPaymentMethod { ...props } />
                        </Formik>
                    </LocaleContext.Provider>
                </PaymentContext.Provider>
            </CheckoutProvider>
        );
    });

    it('renders as credit card payment method', () => {
        const container = mount(<BraintreeCreditCardPaymentMethodTest { ...defaultProps } />);

        expect(container.find(CreditCardPaymentMethod).props())
            .toEqual(expect.objectContaining({
                deinitializePayment: expect.any(Function),
                initializePayment: expect.any(Function),
                method: defaultProps.method,
            }));
    });

    it('initializes method with required config', () => {
        mount(<BraintreeCreditCardPaymentMethodTest { ...defaultProps } />);

        expect(defaultProps.initializePayment)
            .toHaveBeenCalledWith(expect.objectContaining({
                methodId: defaultProps.method.id,
                gatewayId: defaultProps.method.gateway,
                braintree: {
                    threeDSecure: {
                        addFrame: expect.any(Function),
                        removeFrame: expect.any(Function),
                    },
                },
            }));
    });

    it('renders 3DS modal if required by selected method', async () => {
        const component = mount(<BraintreeCreditCardPaymentMethodTest { ...defaultProps } />);
        const initializeOptions = (defaultProps.initializePayment as jest.Mock).mock.calls[0][0];

        act(() => {
            initializeOptions.braintree.threeDSecure.addFrame(
                undefined,
                document.createElement('iframe'),
                jest.fn()
            );
        });

        await new Promise(resolve => process.nextTick(resolve));

        act(() => {
            component.update();
        });

        expect(component.find(Modal).prop('isOpen'))
            .toEqual(true);

        expect(component.find(Modal).render().find('iframe'))
            .toHaveLength(1);
    });

    it('cancels 3DS modal flow if user chooses to close modal', async () => {
        const cancelThreeDSecureVerification = jest.fn();
        const component = mount(<BraintreeCreditCardPaymentMethodTest { ...defaultProps } />);
        const initializeOptions = (defaultProps.initializePayment as jest.Mock).mock.calls[0][0];

        act(() => {
            initializeOptions.braintree.threeDSecure.addFrame(
                undefined,
                document.createElement('iframe'),
                cancelThreeDSecureVerification
            );
        });

        await new Promise(resolve => process.nextTick(resolve));

        act(() => {
            component.update();
        });

        const modal: ReactWrapper<ModalProps> = component.find(Modal);

        act(() => {
            // tslint:disable-next-line:no-non-null-assertion
            modal.prop('onRequestClose')!(new MouseEvent('click') as any);
        });

        expect(cancelThreeDSecureVerification)
            .toHaveBeenCalled();
    });
});