import './ProductCard.css';

const ProductCard = ({ product, cartQty = 0, onAdd, onMinus }: any) => {
  const isLowStock = product.stock < 5 && !product.isTool;

  return (
    <div className="product-card">
      <img src={product.img} alt={product.name} className="product-img" />
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-spec">{product.spec}</p>

        {!product.isTool ? (
          <span className={`stock-badge ${isLowStock ? 'low-stock' : 'normal-stock'}`}>
            {isLowStock ? `库存紧张 (剩${product.stock})` : '库存充足'}
          </span>
        ) : (
          <span className="stock-badge tool-badge">固定工具</span>
        )}
      </div>

      <div className="card-actions">
         {cartQty > 0 ? (
           <div className="qty-controls">
             <button className="btn-minus" onClick={() => onMinus(product)}>-</button>
             <span className="qty-display">{cartQty}</span>
             <button className="btn-plus" onClick={() => onAdd(product)}>+</button>
           </div>
         ) : (
           <button className="btn-add-initial" onClick={() => onAdd(product)}>
             {product.isTool ? "报修/需求" : "加入采购车"}
           </button>
         )}
      </div>
    </div>
  );
};

export default ProductCard;
