import OrderTicket, { type Order } from "../orders/OrderTicket";

const sampleOrder: Order = {
  id: "order-1",
  orderNumber: "042",
  tableNumber: "7",
  status: "in_progress",
  createdAt: new Date(Date.now() - 5 * 60 * 1000),
  items: [
    { id: "item-1", name: "Classic Beef Burger", quantity: 2, modifications: ["Extra Cheese", "No Onions"] },
    { id: "item-2", name: "Caesar Salad", quantity: 1 },
    { id: "item-3", name: "Chocolate Lava Cake", quantity: 1, notes: "Nut allergy" },
  ],
  paymentStatus: "paid",
};

export default function OrderTicketExample() {
  return (
    <div className="w-80">
      <OrderTicket
        order={sampleOrder}
        onStatusChange={(id, status) => console.log("Status change:", id, status)}
        showPaymentStatus={true}
        variant="kitchen"
      />
    </div>
  );
}
