import { CardInstrument, PaymentInitializeOptions } from '@bigcommerce/checkout-sdk';
import React, { useCallback, useContext, FunctionComponent } from 'react';
import { Omit } from 'utility-types';

import { withHostedCreditCardFieldset, WithInjectedHostedCreditCardFieldsetProps } from '../hostedCreditCard';

import { connectFormik, ConnectFormikProps } from '../../common/form';
import { FormContext } from '../../ui/form';
import { PaymentFormValues } from '../PaymentForm';

import HostedDropInPaymentMethod from './HostedDropInPaymentMethod';
import { HostedWidgetPaymentMethodProps } from './HostedWidgetPaymentMethod';

export type DigitalRiverPaymentMethodProps = Omit<HostedWidgetPaymentMethodProps, 'containerId'> & ConnectFormikProps<PaymentFormValues>;

export enum DigitalRiverClasses {
    base =  'form-input optimizedCheckout-form-input',
}

const DigitalRiverPaymentMethod: FunctionComponent<DigitalRiverPaymentMethodProps & WithInjectedHostedCreditCardFieldsetProps> = ({
    initializePayment,
    onUnhandledError,
    getHostedFormOptions,
    getHostedStoredCardValidationFieldset,
    formik: { submitForm },
    ...rest
}) => {
    const { setSubmitted } = useContext(FormContext);
    const containerId = `${rest.method}-component-field`;
    const initializeDigitalRiverPayment = useCallback( async (options: PaymentInitializeOptions, selectedInstrument) => initializePayment({
        ...options,
        digitalriver: {
            containerId,
            configuration: {
                flow: 'checkout',
                showSavePaymentAgreement: false,
                showComplianceSection: true,
                button: {
                    type: 'submitOrder',
                },
                usage: 'unscheduled',
                showTermsOfSaleDisclosure: true,
                paymentMethodConfiguration: {
                    disabledPaymentMethods: [
                        'alipay',
                        'bPay',
                        'codJapan',
                        'klarnaCredit',
                        'konbini',
                        'msts',
                        'payco',
                        'payPal',
                        'payPalCredit',
                        'payPalBilling',
                        'wireTransfer',
                    ],
                    classes: DigitalRiverClasses,
                },
                ...(selectedInstrument && !selectedInstrument?.trustedShippingAddress && { form : await getHostedFormOptions(selectedInstrument) }),
            },
            onSubmitForm: () => {
                setSubmitted(true);
                submitForm();
            },
            onError: (error: Error) => {
                onUnhandledError?.(error);
            },
        },
    }), [initializePayment, containerId, setSubmitted, submitForm, onUnhandledError]);

    function validateInstrument(selectedInstrument: CardInstrument) {
        if (selectedInstrument && selectedInstrument.trustedShippingAddress) {
            return;
        }

        return getHostedStoredCardValidationFieldset(selectedInstrument);
    }

    return <HostedDropInPaymentMethod
        { ...rest }
        containerId={ containerId }
        initializePayment={ initializeDigitalRiverPayment }
        validateInstrument={validateInstrument}
    />;
};

export default connectFormik(withHostedCreditCardFieldset(DigitalRiverPaymentMethod));
