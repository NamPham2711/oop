package com.oop.ecommerce.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyRevenuePointDto {
    /** ISO-8601 yyyy-MM-dd */
    private String day;
    /** Doanh thu theo ngày (VND nguyên). */
    private long revenue;
}

