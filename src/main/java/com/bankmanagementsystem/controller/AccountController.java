package com.bankmanagementsystem.controller;

import com.bankmanagementsystem.dto.AmountRequest;
import com.bankmanagementsystem.dto.TransferRequest;
import com.bankmanagementsystem.model.Account;
import com.bankmanagementsystem.model.Transaction;
import com.bankmanagementsystem.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    // Create a new account
    @PostMapping
    public ResponseEntity<Account> createAccount(@Valid @RequestBody Account account) {
        Account saved = accountService.createAccount(account);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    // Get all accounts
    @GetMapping
    public ResponseEntity<List<Account>> getAllAccounts() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    // Get account by id
    @GetMapping("/{id}")
    public ResponseEntity<Account> getAccountById(@PathVariable Long id) {
        return ResponseEntity.ok(accountService.getAccountById(id));
    }

    // Update account details
    @PutMapping("/{id}")
    public ResponseEntity<Account> updateAccount(@PathVariable Long id, @Valid @RequestBody Account account) {
        return ResponseEntity.ok(accountService.updateAccount(id, account));
    }

    // Delete account
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable Long id) {
        accountService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }

    // Deposit money
    @PostMapping("/{id}/deposit")
    public ResponseEntity<Account> deposit(@PathVariable Long id, @Valid @RequestBody AmountRequest request) {
        Account updated = accountService.deposit(id, request.getAmount(), request.getDescription());
        return ResponseEntity.ok(updated);
    }

    // Withdraw money
    @PostMapping("/{id}/withdraw")
    public ResponseEntity<Account> withdraw(@PathVariable Long id, @Valid @RequestBody AmountRequest request) {
        Account updated = accountService.withdraw(id, request.getAmount(), request.getDescription());
        return ResponseEntity.ok(updated);
    }

    // Transfer money between accounts
    @PostMapping("/{id}/transfer")
    public ResponseEntity<Map<String, String>> transfer(@PathVariable Long id, @Valid @RequestBody TransferRequest request) {
        accountService.transfer(id, request.getToAccountId(), request.getAmount(), request.getDescription());
        return ResponseEntity.ok(Map.of("message", "Transfer completed successfully"));
    }

    // Get transaction history for an account
    @GetMapping("/{id}/transactions")
    public ResponseEntity<List<Transaction>> getTransactionHistory(@PathVariable Long id) {
        return ResponseEntity.ok(accountService.getTransactionHistory(id));
    }

    // Get total balance across all accounts (dashboard summary)
    @GetMapping("/summary/total-balance")
    public ResponseEntity<Map<String, BigDecimal>> getTotalBalance() {
        return ResponseEntity.ok(Map.of("totalBalance", accountService.getTotalBankBalance()));
    }
}
