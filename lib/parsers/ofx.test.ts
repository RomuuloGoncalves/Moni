import { describe, it, expect } from "vitest";
import { parseOfx } from "@/lib/parsers/ofx";
import { InvalidImportFileError } from "@/lib/parsers/types";

const VALID_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260115120000
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>12345
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260101
<DTEND>20260131
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260110
<TRNAMT>-30.50
<FITID>1001
<NAME>Mercado X
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260115
<TRNAMT>100.00
<FITID>1002
<NAME>Salário
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>69.50
<DTASOF>20260131
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

describe("parseOfx", () => {
  it("extracts date, signed amount in cents, and description for each transaction", () => {
    const result = parseOfx(VALID_OFX);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ amountCents: -3050, description: "Mercado X" });
    expect(result[0].date.getUTCFullYear()).toBe(2026);
    expect(result[0].date.getUTCMonth()).toBe(0);
    expect(result[0].date.getUTCDate()).toBe(10);
    expect(result[1]).toMatchObject({ amountCents: 10000, description: "Salário" });
  });

  it("throws InvalidImportFileError on malformed input, without partially importing", () => {
    expect(() => parseOfx("not an ofx file at all")).toThrow(InvalidImportFileError);
  });

  it("throws InvalidImportFileError when the file has no bank transaction list", () => {
    const noTransactions = VALID_OFX.replace(/<BANKTRANLIST>[\s\S]*<\/BANKTRANLIST>/, "");
    expect(() => parseOfx(noTransactions)).toThrow(InvalidImportFileError);
  });
});
