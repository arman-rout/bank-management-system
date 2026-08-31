# Bank Management System

A web-based Bank Management System built with **Spring Boot**, **Spring MVC**, **Hibernate (Spring Data JPA)**, **PostgreSQL**, and a **Bootstrap 5** frontend. Users can create accounts, deposit, withdraw, transfer funds between accounts, view balances, and see full transaction history — all from an attractive, colorful dashboard in the browser.

<img width="1599" height="857" alt="banking" src="https://github.com/user-attachments/assets/3a419f42-95e6-4956-bed8-89bd47df97fc" />


## Features
- Create, view, update, and delete bank accounts
- Deposit and withdraw funds
- Transfer funds between two accounts
- Full transaction history per account
- Live dashboard: total bank balance, total accounts
- Attractive gradient/glassmorphism UI built with Bootstrap 5 + custom CSS
- REST API testable independently via Postman
- Layered architecture: `model → repository → service/impl → controller`
- No Lombok — plain constructors, getters, and setters throughout

## Tech Stack
| Layer          | Technology                        |
|----------------|-------------------------------------|
| Language       | Java 17                            |
| Backend        | Spring Boot 3.2.5, Spring MVC      |
| ORM            | Hibernate (Spring Data JPA)        |
| Database       | PostgreSQL                         |
| Frontend       | HTML5, CSS3, Bootstrap 5, vanilla JS |
| Build Tool     | Maven                              |

---

## 1. Prerequisites
- JDK 17+
- Apache Maven
- PostgreSQL Server (running locally or accessible remotely)
- pgAdmin (for viewing/managing the database)
- Eclipse IDE (Enterprise Java and Web Developers edition recommended)
- Postman (for API testing)
- Chrome (or any browser) to view the dashboard

---

## 2. PostgreSQL Database Setup (pgAdmin)

PostgreSQL doesn't auto-create a database, so create it first.

### Create the database in pgAdmin
1. Open **pgAdmin** and connect to your local PostgreSQL server.
2. Right-click **Databases → Create → Database...**
3. Name it `bank_management_db` (matches `application.properties`) and click **Save**.

Or, using `psql`:
```sql
CREATE DATABASE bank_management_db;
```

### Configure credentials
`src/main/resources/application.properties`:

```properties
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.url=jdbc:postgresql://localhost:5432/bank_management_db
spring.datasource.username=postgres
spring.datasource.password=123
```

Update `username`/`password` if yours differ. Hibernate's `spring.jpa.hibernate.ddl-auto=update` creates the `accounts` and `transactions` tables automatically on first run. Confirm afterward by expanding **bank_management_db → Schemas → public → Tables** in pgAdmin.

---

## 3. Import into Eclipse

1. Unzip `bank-management-system.zip` to a folder of your choice.
2. Open Eclipse → **File → Import...**
3. Select **Maven → Existing Maven Projects** → Next.
4. Click **Browse**, select the unzipped `bank-management-system` folder, and click **Finish**.
5. Eclipse will download dependencies and build the project (may take a minute the first time).
6. Open `BankManagementSystemApplication.java` at:
   `src/main/java/com/bankmanagementsystem/BankManagementSystemApplication.java`
7. Right-click → **Run As → Java Application**.
8. Console output should show Spring Boot starting up and Tomcat starting on port `8080`.

---

## 4. View the Dashboard in Chrome

With the app running, open:

```
http://localhost:8080/
```

This loads the full Bootstrap dashboard — you can create accounts, deposit, withdraw, transfer, and view transaction history entirely from the browser, no Postman required for normal use.

Other useful browser (GET) URLs:
- `http://localhost:8080/api/accounts` — view all accounts (raw JSON)
- `http://localhost:8080/api/accounts/1` — view account with id 1
- `http://localhost:8080/api/accounts/1/transactions` — view transaction history for account 1
- `http://localhost:8080/api/accounts/summary/total-balance` — total balance across all accounts

---

## 5. Postman API Reference

Base URL: `http://localhost:8080/api/accounts`

| Method | Endpoint                              | Description                          |
|--------|-----------------------------------------|----------------------------------------|
| POST   | `/api/accounts`                       | Create a new account                 |
| GET    | `/api/accounts`                       | Get all accounts                     |
| GET    | `/api/accounts/{id}`                   | Get an account by ID                 |
| PUT    | `/api/accounts/{id}`                   | Update account details               |
| DELETE | `/api/accounts/{id}`                   | Delete an account                    |
| POST   | `/api/accounts/{id}/deposit`           | Deposit money into an account        |
| POST   | `/api/accounts/{id}/withdraw`          | Withdraw money from an account       |
| POST   | `/api/accounts/{id}/transfer`          | Transfer money to another account    |
| GET    | `/api/accounts/{id}/transactions`      | Get transaction history for account  |
| GET    | `/api/accounts/summary/total-balance`  | Get total balance across all accounts |

### 5.1 Create Account — `POST /api/accounts`
**Request Body:**
```json
{
  "accountHolderName": "Arman Sheikh",
  "email": "arman@example.com",
  "phone": "9876543210",
  "accountType": "SAVINGS",
  "balance": 5000
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "accountNumber": "ACC1735459200000",
  "accountHolderName": "Arman Sheikh",
  "email": "arman@example.com",
  "phone": "9876543210",
  "accountType": "SAVINGS",
  "balance": 5000.00,
  "createdAt": "2026-08-29T10:15:30"
}
```

### 5.2 Get All Accounts — `GET /api/accounts`
**Response (200 OK):** array of account objects (same shape as above).

### 5.3 Get Account by ID — `GET /api/accounts/1`
**Response (200 OK):** single account object.

**Response (404 Not Found):**
```json
{
  "timestamp": "2026-08-29T10:20:00",
  "status": 404,
  "error": "Not Found",
  "message": "Account not found with id: 99"
}
```

### 5.4 Update Account — `PUT /api/accounts/1`
**Request Body:**
```json
{
  "accountHolderName": "Arman Sheikh",
  "email": "arman.new@example.com",
  "phone": "9876543210",
  "accountType": "CURRENT"
}
```
**Response (200 OK):** updated account object. (Balance is not editable here — use deposit/withdraw.)

### 5.5 Delete Account — `DELETE /api/accounts/1`
**Response:** `204 No Content`

### 5.6 Deposit — `POST /api/accounts/1/deposit`
**Request Body:**
```json
{
  "amount": 1500,
  "description": "Salary credit"
}
```
**Response (200 OK):** account object with updated balance.

### 5.7 Withdraw — `POST /api/accounts/1/withdraw`
**Request Body:**
```json
{
  "amount": 500,
  "description": "ATM withdrawal"
}
```
**Response (200 OK):** account object with updated balance.

**Response (400 Bad Request) — insufficient balance:**
```json
{
  "timestamp": "2026-08-29T10:25:00",
  "status": 400,
  "error": "Insufficient Balance",
  "message": "Insufficient balance in account ACC1735459200000"
}
```

### 5.8 Transfer — `POST /api/accounts/1/transfer`
**Request Body:**
```json
{
  "toAccountId": 2,
  "amount": 1000,
  "description": "Rent payment"
}
```
**Response (200 OK):**
```json
{ "message": "Transfer completed successfully" }
```

### 5.9 Transaction History — `GET /api/accounts/1/transactions`
**Response (200 OK):**
```json
[
  {
    "id": 3,
    "accountId": 1,
    "transactionType": "WITHDRAWAL",
    "amount": 500.00,
    "balanceAfter": 6000.00,
    "description": "ATM withdrawal",
    "transactionDate": "2026-08-29T11:02:10"
  }
]
```

### 5.10 Total Bank Balance — `GET /api/accounts/summary/total-balance`
**Response (200 OK):**
```json
{ "totalBalance": 45250.00 }
```

---

## 6. Project Structure
```
bank-management-system/
├── pom.xml
├── README.md
└── src/main/
    ├── java/com/bankmanagementsystem/
    │   ├── BankManagementSystemApplication.java
    │   ├── model/
    │   │   ├── Account.java
    │   │   ├── Transaction.java
    │   │   ├── AccountType.java
    │   │   └── TransactionType.java
    │   ├── repository/
    │   │   ├── AccountRepository.java
    │   │   └── TransactionRepository.java
    │   ├── dto/
    │   │   ├── AmountRequest.java
    │   │   └── TransferRequest.java
    │   ├── service/
    │   │   ├── AccountService.java
    │   │   └── impl/AccountServiceImpl.java
    │   ├── controller/
    │   │   └── AccountController.java
    │   └── exception/
    │       ├── AccountNotFoundException.java
    │       ├── InsufficientBalanceException.java
    │       └── GlobalExceptionHandler.java
    └── resources/
        ├── application.properties
        └── static/
            ├── index.html
            ├── css/style.css
            └── js/app.js
```

## 7. Notes
- The dashboard (`index.html`) and the REST API run from the **same Spring Boot app** on port `8080` — no separate frontend server needed.
- Account numbers are auto-generated (`ACC` + timestamp) on creation.
- Every deposit, withdrawal, and transfer is recorded as a `Transaction` row, visible from the History button on each account row.
- Deleting an account permanently removes it — there's a browser confirmation prompt before deletion.
