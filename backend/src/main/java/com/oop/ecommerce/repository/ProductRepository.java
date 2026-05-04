package com.oop.ecommerce.repository;

import com.oop.ecommerce.model.Product;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query("select coalesce(sum(p.stockQuantity), 0) from Product p")
    Long sumStockQuantity();
}
