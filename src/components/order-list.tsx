"use client";

import { useOrders } from "@/hooks/use-orders";
import { OrderCard } from "./order-card";

export function OrderList() {
  const orders = useOrders();
  return <section className="orders-section" aria-labelledby="orders-title" aria-busy={orders.isFetching}>
    <div className="list-heading"><div><p className="eyebrow">Seguimiento</p><h2 id="orders-title">Pedidos</h2></div>
      {orders.data && <span className="list-count">{orders.data.length}</span>}
    </div>
    {orders.isPending && <div className="empty-state panel"><p>Cargando pedidos…</p><div className="loading-line" aria-hidden="true" /></div>}
    {orders.isError && <div className="panel query-error" role="alert"><p>{orders.error.message}</p>
      <button className="button" onClick={() => void orders.refetch()}>Reintentar</button></div>}
    {orders.data?.length === 0 && <div className="empty-state panel"><span className="empty-icon" aria-hidden="true">＋</span>
      <h3>Aún no hay pedidos</h3><p className="muted">Registra el primero para empezar a seguir sus paquetes.</p></div>}
    {orders.data && <div className="order-list">{orders.data.map((order) => <OrderCard key={order.id} order={order} />)}</div>}
  </section>;
}
