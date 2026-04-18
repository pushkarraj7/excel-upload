export function SummaryCards({
  totalCompanies,
  // totalAmount,
}: {
  totalCompanies: number;
  // totalAmount: number;
}) {
  return (
    <div className="summary">
      <div className="summary-card">
        <span>Total Companies</span>
        <h3>{totalCompanies}</h3>
      </div>

      {/* <div className="summary-card">
        <span>Total Amount</span>
        <h3>₹ {totalAmount.toLocaleString()}</h3>
      </div> */}
    </div>
  );
}
