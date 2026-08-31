package com.bankmanagementsystem.service;

import com.bankmanagementsystem.model.Account;
import com.bankmanagementsystem.model.Transaction;

import java.math.BigDecimal;
import java.util.List;

public interface AccountService {

    Account createAccount(Account account);

    List<Account> getAllAccounts();

    Account getAccountById(Long id);

    Account updateAccount(Long id, Account accountDetails);

    void deleteAccount(Long id);

    Account deposit(Long id, BigDecimal amount, String description);

    Account withdraw(Long id, BigDecimal amount, String description);

    void transfer(Long fromId, Long toId, BigDecimal amount, String description);

    List<Transaction> getTransactionHistory(Long accountId);

    BigDecimal getTotalBankBalance();
}
