package com.ironedge.controller;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ironedge.model.Transaction;
import com.ironedge.model.TransactionType;
import com.ironedge.model.User;
import com.ironedge.repository.GoalRepository;
import com.ironedge.repository.InvestmentRepository;
import com.ironedge.repository.TransactionRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private GoalRepository goalRepository;
    @Autowired
    private InvestmentRepository investmentRepository;

    @GetMapping
    public Map<String, Object> summary(
            @RequestParam String start,
            @RequestParam String end,
            HttpSession session) {

        User user = (User) session.getAttribute("user");

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        List<Transaction> transactions = transactionRepository.findByUser(user);
        LocalDate startDate = LocalDate.parse(start);
        LocalDate endDate = LocalDate.parse(end);

        double monthlyIncome = transactions.stream()
                .filter(t -> !t.getDate().isBefore(startDate) && !t.getDate().isAfter(endDate))
                .filter(t -> t.getType() == TransactionType.RECEITA)
                .mapToDouble(Transaction::getAmount)
                .sum();

        double monthlyExpense = transactions.stream()
                .filter(t -> !t.getDate().isBefore(startDate) && !t.getDate().isAfter(endDate))
                .filter(t -> t.getType() == TransactionType.DESPESA)
                .mapToDouble(Transaction::getAmount)
                .sum();
        
        double totalIncome = transactions.stream()
                .filter(t -> t.getType() == TransactionType.RECEITA)
                .mapToDouble(Transaction::getAmount)
                .sum();

        double totalExpense = transactions.stream()
                .filter(t -> t.getType() == TransactionType.DESPESA)
                .mapToDouble(Transaction::getAmount)
                .sum();

        double investedInGoals = goalRepository.findByUser(user).stream()
                .mapToDouble(g -> Math.max(0, g.getCurrentAmount()))
                .sum();
        double investedInInvestments = investmentRepository.findByUser(user).stream()
                .mapToDouble(i -> Math.max(0, i.getCurrentAmount()))
                .sum();

        double totalBalance = totalIncome - totalExpense - investedInGoals - investedInInvestments;
        double monthlySavings = monthlyIncome - monthlyExpense - investedInGoals - investedInInvestments;

        Map<String, Object> result = new HashMap<>();
        result.put("monthlyIncome", monthlyIncome);
        result.put("monthlyExpense", monthlyExpense);
        result.put("totalBalance", totalBalance);
        result.put("monthlySavings", monthlySavings);
        result.put("investedInGoals", investedInGoals);
        result.put("investedInInvestments", investedInInvestments);

        // Compatibilidade com frontend legado
        result.put("receitas", monthlyIncome);
        result.put("despesas", monthlyExpense);
        result.put("saldo", totalBalance);

        return result;
    }

    @GetMapping("/dashboard-data")
    public Map<String, Object> dashboardData(HttpSession session) {

    User user = (User) session.getAttribute("user");

    if (user == null) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
    }

    List<Transaction> transactions = transactionRepository.findByUser(user);

    YearMonth currentMonth = YearMonth.now();
    YearMonth startMonth = currentMonth.minusMonths(5);

    Map<YearMonth, double[]> monthlyBuckets = new LinkedHashMap<>();
    YearMonth cursor = startMonth;
    while (!cursor.isAfter(currentMonth)) {
        monthlyBuckets.put(cursor, new double[] {0.0, 0.0}); // [income, expenses]
        cursor = cursor.plusMonths(1);
    }

    Map<String, Double> categoryExpense = new TreeMap<>();

    for (Transaction t : transactions) {
        YearMonth ym = YearMonth.from(t.getDate());
        if (monthlyBuckets.containsKey(ym)) {
            double[] bucket = monthlyBuckets.get(ym);
            if (t.getType() == TransactionType.RECEITA) {
                bucket[0] += t.getAmount();
            } else {
                bucket[1] += t.getAmount();
            }
        }

        if (t.getType() == TransactionType.DESPESA && ym.equals(currentMonth)) {
            String category = (t.getCategory() == null || t.getCategory().isBlank()) ? "Geral" : t.getCategory();
            categoryExpense.merge(category, t.getAmount(), Double::sum);
        }
    }

    List<Map<String, Object>> monthlyData = new ArrayList<>();
    for (Map.Entry<YearMonth, double[]> entry : monthlyBuckets.entrySet()) {
        double[] values = entry.getValue();
        Map<String, Object> monthItem = new HashMap<>();
        monthItem.put("month", entry.getKey().toString());
        monthItem.put("income", values[0]);
        monthItem.put("expenses", values[1]);
        monthlyData.add(monthItem);
    }

    Map<String, String> categoryColors = Map.of(
            "Moradia", "#60a5fa",
            "Alimentação", "#4ade80",
            "Transporte", "#facc15",
            "Saúde", "#f87171",
            "Lazer", "#a78bfa",
            "Geral", "#22d3ee"
    );

    List<Map<String, Object>> categoryBreakdown = categoryExpense.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue(Comparator.reverseOrder()))
            .map(entry -> {
                Map<String, Object> item = new HashMap<>();
                item.put("categoryName", entry.getKey());
                item.put("amount", entry.getValue());
                item.put("color", categoryColors.getOrDefault(entry.getKey(), "#94a3b8"));
                return item;
            })
            .toList();

    Map<String, Object> data = new HashMap<>();
    data.put("monthlyData", monthlyData);
    data.put("categoryBreakdown", categoryBreakdown);

    return data;
}

}
