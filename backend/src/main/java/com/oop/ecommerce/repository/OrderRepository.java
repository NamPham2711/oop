package com.oop.ecommerce.repository;

import com.oop.ecommerce.model.Order;
import com.oop.ecommerce.model.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByIdAndUserUsername(Long id, String username);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.payosOrderCode = :code")
    Optional<Order> findLockedByPayosOrderCode(@Param("code") Long code);

    boolean existsByPayosOrderCode(Long payosOrderCode);

    @Query("select coalesce(sum(o.totalAmount), 0) from Order o where o.status = :status")
    Long sumTotalAmountByStatus(@Param("status") OrderStatus status);

    @Query("select coalesce(sum(li.quantity), 0) from OrderLineItem li join li.order o where o.status = :status")
    Long sumItemsSoldByStatus(@Param("status") OrderStatus status);

    interface DailyRevenueRow {
        LocalDate getDay();

        Long getRevenue();
    }

    @Query("""
            select function('date', o.createdAt) as day,
                   coalesce(sum(o.totalAmount), 0) as revenue
            from Order o
            where o.status = :status
              and o.createdAt >= :from
              and o.createdAt < :to
            group by function('date', o.createdAt)
            order by day asc
            """)
    List<DailyRevenueRow> dailyRevenueBetween(
            @Param("status") OrderStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    interface CategorySalesRow {
        String getCategory();

        Long getQuantity();
    }

    @Query("""
            select p.category as category,
                   coalesce(sum(li.quantity), 0) as quantity
            from OrderLineItem li
            join li.order o,
                 Product p
            where p.id = li.productId
              and o.status = :status
            group by p.category
            order by quantity desc
            """)
    List<CategorySalesRow> salesByCategory(@Param("status") OrderStatus status);
}