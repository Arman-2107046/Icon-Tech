import { requireCustomer } from "@/src/lib/auth/guards";
import { listCustomerAddresses } from "@/src/modules/customers";
import { AddressBook } from "./address-book";

export default async function AccountAddressesPage() {
  const session = await requireCustomer("/account/addresses");
  const addresses = await listCustomerAddresses(session.customer.id);
  return (
    <>
      <h1 className="display display-2xl">Addresses</h1>
      <AddressBook addresses={addresses.map((a) => ({ id: a.id, firstName: a.firstName, lastName: a.lastName, company: a.company, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, country: a.country, isDefault: a.isDefault }))} />
    </>
  );
}
