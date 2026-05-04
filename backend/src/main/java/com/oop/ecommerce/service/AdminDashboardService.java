package com.oop.ecommerce.service;

import com.oop.ecommerce.dto.admin.CategorySalesDto;
import com.oop.ecommerce.dto.admin.DailyRevenuePointDto;
import com.oop.ecommerce.dto.admin.DashboardStatsDto;
import com.oop.ecommerce.model.OrderStatus;
import com.oop.ecommerce.repository.OrderRepository;
import com.oop.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public DashboardStatsDto getDashboardStats(int days) {
        int safeDays = Math.max(1, Math.min(days, 365));

        long totalProducts = productRepository.count();
        long itemsInStock = nvl(productRepository.sumStockQuantity());

        long totalRevenue = nvl(orderRepository.sumTotalAmountByStatus(OrderStatus.PAID));
        long itemsSold = nvl(orderRepository.sumItemsSoldByStatus(OrderStatus.PAID));

        List<DailyRevenuePointDto> dailyRevenue = buildDailyRevenueSeries(safeDays);
        List<CategorySalesDto> salesByCategory = buildSalesByCategory();

        return DashboardStatsDto.builder()
                .totalRevenue(totalRevenue)
                .totalProducts(totalProducts)
                .itemsInStock(itemsInStock)
                .itemsSold(itemsSold)
                .dailyRevenue(dailyRevenue)
                .salesByCategory(salesByCategory)
                .build();
    }

    @Transactional(readOnly = true)
    public DashboardStatsDto getDashboardStatsForMonth(int year, int month) {
        LocalDate firstDay;
        try {
            firstDay = LocalDate.of(year, month, 1);
        } catch (Exception e) {
            return getDashboardStats(30);
        }

        long totalProducts = productRepository.count();
        long itemsInStock = nvl(productRepository.sumStockQuantity());

        long totalRevenue = nvl(orderRepository.sumTotalAmountByStatus(OrderStatus.PAID));
        long itemsSold = nvl(orderRepository.sumItemsSoldByStatus(OrderStatus.PAID));

        List<DailyRevenuePointDto> dailyRevenue = buildDailyRevenueSeriesForMonth(firstDay);
        List<CategorySalesDto> salesByCategory = buildSalesByCategory();

        return DashboardStatsDto.builder()
                .totalRevenue(totalRevenue)
                .totalProducts(totalProducts)
                .itemsInStock(itemsInStock)
                .itemsSold(itemsSold)
                .dailyRevenue(dailyRevenue)
                .salesByCategory(salesByCategory)
                .build();
    }

    private List<DailyRevenuePointDto> buildDailyRevenueSeries(int days) {
        LocalDate today = LocalDate.now();
        LocalDate startDay = today.minusDays(days - 1L);

        LocalDateTime from = startDay.atStartOfDay();
        LocalDateTime to = today.plusDays(1).atStartOfDay();

        List<OrderRepository.DailyRevenueRow> rows = orderRepository.dailyRevenueBetween(OrderStatus.PAID, from, to);
        Map<LocalDate, Long> revenueByDay = new HashMap<>();
        for (OrderRepository.DailyRevenueRow r : rows) {
            if (r.getDay() != null) {
                revenueByDay.put(r.getDay(), nvl(r.getRevenue()));
            }
        }

        List<DailyRevenuePointDto> series = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            LocalDate d = startDay.plusDays(i);
            series.add(DailyRevenuePointDto.builder()
                    .day(d.toString())
                    .revenue(revenueByDay.getOrDefault(d, 0L))
                    .build());
        }
        return series;
    }

    private List<DailyRevenuePointDto> buildDailyRevenueSeriesForMonth(LocalDate firstDayOfMonth) {
        LocalDate fromDay = firstDayOfMonth;
        LocalDate toDayExclusive = firstDayOfMonth.plusMonths(1);

        LocalDateTime from = fromDay.atStartOfDay();
        LocalDateTime to = toDayExclusive.atStartOfDay();

        List<OrderRepository.DailyRevenueRow> rows = orderRepository.dailyRevenueBetween(OrderStatus.PAID, from, to);
        Map<LocalDate, Long> revenueByDay = new HashMap<>();
        for (OrderRepository.DailyRevenueRow r : rows) {
            if (r.getDay() != null) {
                revenueByDay.put(r.getDay(), nvl(r.getRevenue()));
            }
        }

        int daysInMonth = fromDay.lengthOfMonth();
        List<DailyRevenuePointDto> series = new ArrayList<>(daysInMonth);
        for (int i = 0; i < daysInMonth; i++) {
            LocalDate d = fromDay.plusDays(i);
            series.add(DailyRevenuePointDto.builder()
                    .day(d.toString())
                    .revenue(revenueByDay.getOrDefault(d, 0L))
                    .build());
        }
        return series;
    }

    private List<CategorySalesDto> buildSalesByCategory() {
        List<OrderRepository.CategorySalesRow> rows = orderRepository.salesByCategory(OrderStatus.PAID);
        long totalQty = 0;
        for (OrderRepository.CategorySalesRow r : rows) {
            totalQty += nvl(r.getQuantity());
        }

        List<CategorySalesDto> out = new ArrayList<>(rows.size());
        for (OrderRepository.CategorySalesRow r : rows) {
            long qty = nvl(r.getQuantity());
            double percent = totalQty <= 0 ? 0.0 : (qty * 100.0) / totalQty;
            out.add(CategorySalesDto.builder()
                    .category(normalizeCategory(r.getCategory()))
                    .quantity(qty)
                    .percent(percent)
                    .build());
        }
        return out;
    }

    private static String normalizeCategory(String category) {
        if (category == null || category.isBlank()) return "Khác";
        return category.trim();
    }

    private static long nvl(Long v) {
        return v == null ? 0L : v;
    }
}

