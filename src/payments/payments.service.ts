import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
    

    private readonly stripe = new Stripe(envs.stripeSecret)

    async createPaymentSession(paymentSessionDto: PaymentSessionDto) {

        const { items, currency, orderId   } = paymentSessionDto;

        const lineItems = items.map( item => 
            {
            return {
                price_data: { 
                    currency: currency,
                    product_data: {
                        name: item.name
                    },
                    unit_amount: Math.round( item.price * 100 ), // 20 dolares  2000 / 100 = 20.00
                },
                quantity: item.quantity
            }
        } )
        
        const session = await this.stripe.checkout.sessions.create({

            //? colocar aqui el ID del orden
            payment_intent_data: {
                metadata: {
                    orderId: orderId
                }
            },

            line_items: lineItems,
            mode: 'payment',
            success_url: 'http://localhost:3003/api/payments/success',
            cancel_url: 'http://localhost:3003/api/payments/cancel'

        });

        return session;

    }


    async stripeWebhook( req: Request, res: Response ){
        const sig = req.headers['stripe-signature'];

        //?Testing
        // const endpointSecret = "whsec_1cae8992e006d406b9ec76910dfc7c0b9e44da4ffe340d4b5f364caa273157c9";
        //?Real
        const endpointSecret = "whsec_XWUQFatHGIQCO3zaGj5r5CkG7WPuFeXf";

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(req['rawBody'], sig, endpointSecret);
        } catch (err) {
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        switch( event.type ){
            case 'charge.succeeded':
                const chargeSucceeded = event.data.object;
                console.log({
                    metadata: chargeSucceeded.metadata,
                    orderId: chargeSucceeded.metadata.orderId
                });
            break;

            default: 
                console.log(`Event ${ event.type } not handled`);
                
        }

        return res.status(200).json({ sig })
    }

}
