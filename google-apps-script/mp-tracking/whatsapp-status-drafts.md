# Al Barakah Honey — WhatsApp status drafts

Placeholders:

- `{{Customer Name}}`
- `{{Order Number}}`
- `{{Tracking Number}}`
- `{{Amount}}` / Total Amount
- `{{Full Address}}` (Address + City)

---

## 1. Booked

```
Hi {{Customer Name}}! 👋

Your Al Barakah Honey order #{{Order Number}} has been booked with M&P. 🍯📦

💰 COD Amount: Rs. {{Total Amount}}
📍 Delivery Address: {{Address}}, {{City}}

Please check your delivery address and COD amount above.

✅ If everything is correct, please reply CONFIRM.
✏️ If there is any issue with your address, simply reply with the correct details.

Thank you for choosing Al Barakah Honey 💛
Pure Blessing in Every Drop 🍯
```

---

## 2. Status updates (shared layout)

Shell stays the same. **Headline** + **support line** change per M&P status.
For **Unsuccessful**, **Hold for Advice**, and **Failed Delivered**, include M&P Tracking Detail as the reason when available.

```
Hi {{Customer Name}}! 👋

{{STATUS HEADLINE}}

📝 Reason: {{Tracking Detail}}   ← only on Unsuccessful / Hold / Failed Delivered

{{SUPPORT LINE}}

💰 COD Amount: Rs. {{Amount}}
📍 Delivery Address: {{Full Address}}
🔎 Tracking Number: {{Tracking Number}}

Please check your delivery address and COD amount above. If you notice any issue, simply reply to this message and let us know.

Thank you for choosing Al Barakah Honey 💛
Pure Blessing in Every Drop 🍯
```

### Status → headline + support line

| Status | Headline | Support line |
| --- | --- | --- |
| Arrived at OPS Facility | Good news! …has arrived at the M&P hub facility. 🍯📦 | 🏭 Your parcel is at the M&P facility and being prepared for the next move. |
| In-transit | Good news! …is now in transit with M&P. 🍯📦 | 🚚 Your parcel is on its way to you! |
| Reached at Destination | Good news! …has reached your city and is ready for delivery. 📍🍯 | 📍 It is in your city and will move toward final delivery soon. |
| Out-for-Delivery | Good news! …is out for delivery today! 🚚🎉 | 📞 Please keep your phone available so someone can receive the parcel. |
| Unsuccessful Delivery Attempt | M&P tried to deliver … but the delivery attempt was unsuccessful. 📦 | 🙏 Please reply here if you were unavailable, or if your address needs an update — we'll help get it re-attempted. |
| Hold for Advice | …is on hold with M&P while they wait for further instructions. ⏸️📦 | ✍️ Please reply to this message with your guidance so we can help M&P deliver your parcel. |
| Re-Attempt Advice | Good news! M&P has scheduled another delivery attempt for …. 🚚 | 📞 Please keep your phone available and make sure someone can receive the parcel. |
| Failed Delivered | Unfortunately, delivery of … could not be completed and the parcel may be returned. 📦 | 💬 If you still want this order, reply here and we'll help with the next step. |
| Return – In Transit | …is on its way back to us (return in transit). 📦 | 💬 If you still want to receive your order, reply here and we'll assist you. |
| Return – Reached at Origin | …has reached the origin city during return. 📦 | 💬 Reply here if you'd still like us to arrange delivery for you. |
| Return – Out For Delivery | …is out for delivery back to us as a return. 📦 | 💬 Reply here if you still want your order and we'll help you. |
| Return to Vendor/Shipper | …has been returned to us by M&P. 📦 | 💬 Reply "YES" if you'd still like to receive your honey and we'll help with the next step. |
| Other / unknown | …status update: {{Status}}. 🍯📦 | ℹ️ Please check the details below and reply if anything looks wrong. |

---

## 3. Delivered (includes Google review link)

```
Hi {{Customer Name}}! 👋

Good news! Your Al Barakah Honey order #{{Order Number}} has been successfully delivered. 🎉🍯

We hope you enjoy your honey!

💰 COD Amount: Rs. {{Amount}}
📍 Delivery Address: {{Full Address}}
🔎 Tracking Number: {{Tracking Number}}

Please leave us a quick review:
https://g.page/r/Cb5ju-Dzbs1nEBM/review

If you'd like to order more, just call or WhatsApp us and we'll book your order:
0325-6957327

Thank you for choosing Al Barakah Honey 💛
Pure Blessing in Every Drop 🍯
```
