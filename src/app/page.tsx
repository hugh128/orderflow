import { OrderForm } from "@/components/order-form";
import { OrderList } from "@/components/order-list";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Ir al contenido</a>
      <header className="site-header"><div className="header-inner">
        <div className="brand"><span className="brand-mark" aria-hidden="true">O</span>Orderflow</div>
        <span className="header-caption">Pedidos · Paquetes · Avance</span>
      </div></header>
      <main id="main" className="page-shell">
        <div className="page-heading"><p className="eyebrow">Tu operación, en orden</p>
          <h1>Seguimiento de pedidos</h1><p className="muted">Registra un pedido y consulta el avance de cada paquete, en un solo lugar.</p>
        </div>
        <div className="workspace"><aside><OrderForm /></aside><OrderList /></div>
        <footer className="page-footer">Orderflow <span>El avance se calcula por unidades listas.</span></footer>
      </main>
    </>
  );
}
