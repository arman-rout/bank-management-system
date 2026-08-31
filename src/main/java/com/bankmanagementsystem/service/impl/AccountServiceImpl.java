package com.bankmanagementsystem.service.impl;

import com.bankmanagementsystem.exception.AccountNotFoundException;
import com.bankmanagementsystem.exception.InsufficientBalanceException;
import com.bankmanagementsystem.model.Account;
import com.bankmanagementsystem.model.Transaction;
import com.bankmanagementsystem.model.TransactionType;
import com.bankmanagementsystem.repository.AccountRepository;
import com.bankmanagementsystem.repository.TransactionRepository;
import com.bankmanagementsystem.service.AccountService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    public AccountServiceImpl(AccountRepository accountRepository,
                               TransactionRepository transactionRepository) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
    }

    @Override
    public Account createAccount(Account account) {
        if (account.getBalance() == null) {
            account.setBalance(BigDecimal.ZERO);
        }
        return accountRepository.save(account);
    }

    @Override
    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }

    @Override
    public Account getAccountById(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new AccountNotFoundException(id));
    }

    @Override
    public Account updateAccount(Long id, Account accountDetails) {
        Account existing = getAccountById(id);
        existing.setAccountHolderName(accountDetails.getAccountHolderName());
        existing.setEmail(accountDetails.getEmail());
        existing.setPhone(accountDetails.getPhone());
        existing.setAccountType(accountDetails.getAccountType());
        return accountRepository.save(existing);
    }

    @Override
    public void deleteAccount(Long id) {
        Account existing = getAccountById(id);
        accountRepository.delete(existing);
    }

    @Override
    @Transactional
    public Account deposit(Long id, BigDecimal amount, String description) {
        Account account = getAccountById(id);
        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);

        Transaction transaction = new Transaction(account, TransactionType.DEPOSIT, amount,
                account.getBalance(), description != null ? description : "Deposit");
        transactionRepository.save(transaction);

        return account;
    }

    @Override
    @Transactional
    public Account withdraw(Long id, BigDecimal amount, String description) {
        Account account = getAccountById(id);

        if (account.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance in account " + account.getAccountNumber());
        }

        account.setBalance(account.getBalance().subtract(amount));
        accountRepository.save(account);

        Transaction transaction = new Transaction(account, TransactionType.WITHDRAWAL, amount,
                account.getBalance(), description != null ? description : "Withdrawal");
        transactionRepository.save(transaction);

        return account;
    }

    @Override
    @Transactional
    public void transfer(Long fromId, Long toId, BigDecimal amount, String description) {
        Account fromAccount = getAccountById(fromId);
        Account toAccount = getAccountById(toId);

        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance in account " + fromAccount.getAccountNumber());
        }

        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        toAccount.setBalance(toAccount.getBalance().add(amount));

        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);

        String desc = description != null ? description : "Transfer";

        transactionRepository.save(new Transaction(fromAccount, TransactionType.TRANSFER_OUT, amount,
                fromAccount.getBalance(), desc + " to " + toAccount.getAccountNumber()));

        transactionRepository.save(new Transaction(toAccount, TransactionType.TRANSFER_IN, amount,
                toAccount.getBalance(), desc + " from " + fromAccount.getAccountNumber()));
    }

    @Override
    public List<Transaction> getTransactionHistory(Long accountId) {
        getAccountById(accountId); // ensures account exists
        return transactionRepository.findByAccountIdOrderByTransactionDateDesc(accountId);
    }

    @Override
    public BigDecimal getTotalBankBalance() {
        return accountRepository.findAll().stream()
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
