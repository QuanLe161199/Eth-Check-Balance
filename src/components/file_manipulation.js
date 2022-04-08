import { useEffect, useState } from "react";
import readXlsxFile from "read-excel-file";
import writeXlsxFile from "write-excel-file";
import Papa from "papaparse";
import { CSVLink } from "react-csv";
import Fortmatic from "fortmatic";
import { ethers } from "ethers";

const fm = new Fortmatic("pk_live_2E5F208FF8CB3A21", "mainnet"); // create a Fortmatic project to get API key
const provider = new ethers.providers.Web3Provider(fm.getProvider());

const FileManipulation = () => {
    // data includes the index, the address and the balance of clients
    const [clients, setClients] = useState(null);
    const [clientsLeft, setClientsLeft] = useState(null);
    const [clientsRight, setClientsRight] = useState(null);
    const [itemsLeft, setItemsLeft] = useState(null);
    const [itemsRight, setItemsRight] = useState(null);

    // use to switch pages
    const [totalPages, setTotalPages] = useState(0);
    const [pageIndex, setPageIndex] = useState(1);
    const [pageNumbers, setPageNumbers] = useState([]);

    // use to manage invalid addresses
    const [invalidAddresses, setInvalidAddresses] = useState(null);
    const [pageIncludeInvalidAddresses, setPageIncludeInvalidAddresses] =
        useState([]);

    // use to download address files
    const [validAddressFile, setValidAddressFile] = useState(null);
    const [invalidAddressFile, setInvalidAddressFile] = useState(null);

    // use to load to check balance
    const [isLoading, setLoading] = useState(false);
    const [totalAddress, setTotalAddress] = useState(0);
    const [loadIndex, setLoadIndex] = useState(0);

    // use to recognize read file
    const [fileType, setFileType] = useState(null);

    // minimum balance
    const [minimumBalance, setMinimumBalance] = useState(0.25);

    // when the clients list changes, then change the two display lists
    useEffect(() => {
        if (clients) {
            var dataLeft = [];
            var dataRight = [];

            clients.forEach((client) => {
                if (parseInt((client?.index - 1) / 10) % 2 === 0) {
                    dataLeft.push(client);
                } else {
                    dataRight.push(client);
                }
            });

            var i = clients[clients.length - 1]?.index + 1;
            while (dataLeft.length > dataRight.length) {
                dataRight.push({
                    index: i,
                    address: "",
                    balance: minimumBalance,
                });
                i++;
            }

            setClientsLeft(dataLeft);
            setClientsRight(dataRight);

            // calculate the number of pages
            var total = parseInt(dataLeft.length / 10);
            if (dataLeft.length % 10) {
                total++;
            }
            setTotalPages(total);

            // update invalid addresses to the list
            setInvalidAddresses(
                clients.filter(
                    (client) =>
                        client?.balance < minimumBalance ||
                        client?.balance === "Invalid address"
                )
            );

            // update two files downloading
            updateDownloadingFiles();
        } else {
            setValidAddressFile(null);
            setInvalidAddressFile(null);
        }
    }, [clients]);

    const updateDownloadingFiles = () => {
        if (fileType === ".xlsx") {
            var validAddressData = [
                [
                    { type: Number, value: null },
                    { type: Number, value: null },
                    { type: String, value: null },
                ],
                [
                    { type: Number, value: null },
                    { type: Number, value: null },
                    { type: String, value: null },
                ],
            ];
            var invalidAddressData = [
                [
                    { type: Number, value: null },
                    { type: Number, value: null },
                    { type: String, value: null },
                ],
                [
                    { type: Number, value: null },
                    { type: Number, value: null },
                    { type: String, value: null },
                ],
            ];

            var validIndex = 1;
            var invalidIndex = 1;
            clients.forEach((client) => {
                client?.balance === "Invalid address" ||
                client?.balance < minimumBalance
                    ? invalidAddressData.push([
                          { type: Number, value: null },
                          { type: Number, value: invalidIndex++ },
                          { type: String, value: client?.address },
                      ])
                    : validAddressData.push([
                          { type: Number, value: null },
                          { type: Number, value: validIndex++ },
                          { type: String, value: client?.address },
                      ]);
            });
            validIndex === 1
                ? setValidAddressFile(null)
                : setValidAddressFile(validAddressData);
            invalidIndex === 1
                ? setInvalidAddressFile(null)
                : setInvalidAddressFile(invalidAddressData);
        } else {
            var validAddressData = [];
            var invalidAddressData = [];

            var validIndex = 1;
            var invalidIndex = 1;
            clients.forEach((client) => {
                client?.balance === "Invalid address" ||
                client?.balance < minimumBalance
                    ? invalidAddressData.push([
                          (invalidIndex++).toString(),
                          client?.address,
                      ])
                    : validAddressData.push([
                          (validIndex++).toString(),
                          client?.address,
                      ]);
            });
            validIndex === 1
                ? setValidAddressFile(null)
                : setValidAddressFile(validAddressData);
            invalidIndex === 1
                ? setInvalidAddressFile(null)
                : setInvalidAddressFile(invalidAddressData);
        }
    };

    // when the two display lists change, then change the two display item lists
    useEffect(() => {
        setItemsLeft(clientsLeft?.slice((pageIndex - 1) * 10, pageIndex * 10));
        setItemsRight(
            clientsRight?.slice((pageIndex - 1) * 10, pageIndex * 10)
        );
    }, [clientsLeft, clientsRight, pageIndex]);

    // change the number of page button lists
    useEffect(() => {
        var pageNumberArrays = [];
        if (totalPages <= 3) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumberArrays.push(i);
            }
        } else {
            if (pageIndex === 1) {
                pageNumberArrays = [1, 2, 3];
            } else if (pageIndex === totalPages) {
                pageNumberArrays = [totalPages - 2, totalPages - 1, totalPages];
            } else {
                pageNumberArrays = [pageIndex - 1, pageIndex, pageIndex + 1];
            }
        }

        setPageNumbers(pageNumberArrays);
    }, [totalPages, pageIndex]);

    useEffect(() => {
        if (invalidAddresses) {
            var array = [];
            invalidAddresses.forEach((invalidAddress) => {
                var pageIndexIncludeInvalidAddress = parseInt(
                    invalidAddress?.index / 20
                );
                if (invalidAddress?.index % 20) {
                    pageIndexIncludeInvalidAddress++;
                }

                if (array[array.length - 1] != pageIndexIncludeInvalidAddress) {
                    array.push(pageIndexIncludeInvalidAddress);
                }
            });
            setPageIncludeInvalidAddresses(array);
        }
    }, [invalidAddresses]);

    //get ethereum balance by public address
    const getBalance = async (address) => {
        // var rawBalance = await provider.getBalance(address);
        // return parseFloat(ethers.utils.formatEther(rawBalance));
        return Math.random(1);
    };

    const importFile = async (e) => {
        const file = e.target.files[0];
        // check if input file is excel or csv
        if (file.name.match("^(?:(?!~$).)+.(?:xlsx?|csv)$")) {
            // if input file is an excel file
            if (file.name.match("^(?:(?!~$).)+.(?:xlsx)$")) {
                setFileType(".xlsx");
                setLoading(true);

                var data = [];

                var index = 0;

                await readXlsxFile(file).then(async (rows) => {
                    console.log(rows);
                    var nullRows = 0;
                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i][1]) {
                            break;
                        }
                        nullRows++;
                    }
                    setTotalAddress(rows.length - nullRows);
                });

                // read the context of the input file
                await readXlsxFile(file).then(async (rows) => {
                    for (let i = 0; i < rows.length; i++) {
                        if (rows[i][1]) {
                            setLoadIndex(index++);
                            try {
                                let balance = await getBalance(rows[i][2]);
                                data.push({
                                    index: rows[i][1],
                                    address: rows[i][2],
                                    balance: balance.toFixed(3),
                                });
                            } catch (e) {
                                data.push({
                                    index: rows[i][1],
                                    address: rows[i][2],
                                    balance: "Invalid address",
                                });
                            }
                        }
                    }

                    // reset input file
                    e.target.value = null;
                    setClients(data);
                    setPageIndex(1);
                    setLoading(false);
                });
            }

            // if input file is a csv file
            if (file.name.match("^(?:(?!~$).)+.(?:csv)$")) {
                setFileType(".csv");
                setLoading(true);

                var data = [];

                var index = 0;

                Papa.parse(e.target.files[0], {
                    header: false,
                    skipEmptyLines: true,
                    complete: async (results) => {
                        const rows = results.data;
                        setTotalAddress(rows.length);
                        for (let i = 0; i < rows.length; i++) {
                            if (rows[i][0]) {
                                setLoadIndex(index++);
                                try {
                                    let balance = await getBalance(rows[i][1]);
                                    data.push({
                                        index: rows[i][0],
                                        address: rows[i][1],
                                        balance: balance.toFixed(3),
                                    });
                                } catch (e) {
                                    data.push({
                                        index: rows[i][0],
                                        address: rows[i][1],
                                        balance: "Invalid address",
                                    });
                                }
                            }
                        }

                        // reset input file
                        e.target.value = null;
                        setClients(data);
                        setPageIndex(1);
                        setLoading(false);
                    },
                });
            }
        } else {
            //notification;
        }
    };

    const switchPageIncludeInvalidAddress = () => {
        var checkPoint = -1;
        for (let i = 0; i < pageIncludeInvalidAddresses.length; i++) {
            if (pageIndex === pageIncludeInvalidAddresses[i]) {
                checkPoint = i;
                break;
            }
        }

        if (checkPoint != -1) {
            setPageIndex(
                pageIncludeInvalidAddresses[
                    checkPoint === pageIncludeInvalidAddresses.length - 1
                        ? 0
                        : checkPoint + 1
                ]
            );
        } else {
            setPageIndex(pageIncludeInvalidAddresses[0]);
        }
    };

    const changeMinimumBalance = (e) => {
        try {
            var newMinimumBalance = parseFloat(e.target.value);
            console.log("ha", newMinimumBalance);
            newMinimumBalance <= 0
                ? setMinimumBalance(0.25)
                : setMinimumBalance(newMinimumBalance);
            updateDownloadingFiles();
        } catch (e) {
            console.log(e);
        }
    };

    useEffect(() => {
        console.log("hi", minimumBalance);
    }, [minimumBalance]);

    return (
        <div className="file-manipulation">
            {clients && (
                <div className="balance">
                    <div className="balance-text">Minimum Balance</div>
                    <input
                        className="balance-input"
                        onChange={changeMinimumBalance}
                    ></input>
                </div>
            )}
            {validAddressFile && (
                <CSVLink
                    id="download-valid"
                    filename="valid-addresses.csv"
                    data={validAddressFile}
                >
                    Download me
                </CSVLink>
            )}
            {invalidAddressFile && (
                <CSVLink
                    id="download-invalid"
                    filename="invalid-addresses.csv"
                    data={invalidAddressFile}
                >
                    Download me
                </CSVLink>
            )}
            {!clients && isLoading && (
                <button className="select-file-btn-1 cursor-no-drop">
                    <div className="loader-1"></div>
                    {`${loadIndex} / ${totalAddress} checked`}
                </button>
            )}
            {!clients && !isLoading && (
                <button
                    className="select-file-btn-1"
                    onClick={() => {
                        document.getElementById("select-file").click();
                    }}
                >
                    <i className="fa fa-icon-1">&#xf196;</i>
                    Select File
                </button>
            )}
            <input id="select-file" type="file" onChange={importFile} />
            <div className="row">
                {clients && isLoading && (
                    <button className="select-file-btn-2  cursor-no-drop">
                        <i className="loader-2"></i>
                        {`${loadIndex} / ${totalAddress} checked`}
                    </button>
                )}
                {clients && !isLoading && (
                    <button
                        className="select-file-btn-2"
                        onClick={() => {
                            document.getElementById("select-file").click();
                        }}
                    >
                        <i className="fa fa-icon-2">&#xf196;</i>
                        Select File
                    </button>
                )}

                {invalidAddressFile && (
                    <button
                        className="download-file-btn"
                        onClick={() => {
                            fileType === ".xlsx"
                                ? writeXlsxFile(invalidAddressFile, {
                                      fileName: "invalid-addresses.xlsx",
                                  })
                                : document
                                      .getElementById("download-invalid")
                                      .click();
                        }}
                    >
                        <i className="fa fa-icon-2">&#xf063;</i>
                        Invalid Address File
                    </button>
                )}
                {validAddressFile && (
                    <button
                        className="download-file-btn"
                        onClick={() => {
                            fileType === ".xlsx"
                                ? writeXlsxFile(validAddressFile, {
                                      fileName: "valid-addresses.xlsx",
                                  })
                                : document
                                      .getElementById("download-valid")
                                      .click();
                        }}
                    >
                        <i className="fa fa-icon-2">&#xf063;</i>
                        Valid Address File
                    </button>
                )}
            </div>
            {clients && (
                <div className="row">
                    <div className="column">
                        <table>
                            <tbody>
                                <tr>
                                    <th>Index</th>
                                    <th>Public address</th>
                                    <th>ETH Balance</th>
                                </tr>

                                {itemsLeft?.map((client) => {
                                    return (
                                        <tr
                                            key={client?.index}
                                            className={
                                                client?.balance <
                                                    minimumBalance ||
                                                client?.balance ===
                                                    "Invalid address"
                                                    ? "danger"
                                                    : ""
                                            }
                                        >
                                            <td className="column-index">
                                                {client?.index}
                                            </td>
                                            <td className="column-address">
                                                {client?.address}
                                            </td>
                                            <td className="column-balance">
                                                {client?.balance}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="column">
                        <table>
                            <tbody>
                                <tr>
                                    <th>Index</th>
                                    <th>Public address</th>
                                    <th>ETH Balance</th>
                                </tr>

                                {itemsRight?.map((client) => {
                                    return (
                                        <tr
                                            key={client?.index}
                                            className={
                                                client?.balance <
                                                    minimumBalance ||
                                                client?.balance ===
                                                    "Invalid address"
                                                    ? "danger"
                                                    : ""
                                            }
                                        >
                                            <td
                                                className={`column-balance ${
                                                    client?.address
                                                        ? ""
                                                        : "hidden-color"
                                                }`}
                                            >
                                                {client?.index}
                                            </td>
                                            <td className="column-address">
                                                {client?.address}
                                            </td>
                                            <td
                                                className={`column-balance ${
                                                    client?.address
                                                        ? ""
                                                        : "hidden-color"
                                                }`}
                                            >
                                                {client?.balance}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="row">
                {invalidAddresses && (
                    <div>
                        {invalidAddresses.length ? (
                            <div>
                                <div className="float-left text-notification-danger">
                                    {invalidAddresses.length === 1
                                        ? `There is ${invalidAddresses.length} invalid address`
                                        : `There are ${invalidAddresses.length} invalid addresses`}
                                </div>
                                <button
                                    className="button-switch"
                                    onClick={switchPageIncludeInvalidAddress}
                                >
                                    Go to
                                </button>
                            </div>
                        ) : (
                            <div className="float-left text-notification-success">
                                {"No invalid address"}
                            </div>
                        )}
                    </div>
                )}
                <div className="pagination ">
                    {totalPages > 3 && (
                        <div
                            className="page-button"
                            onClick={() => {
                                setPageIndex(1);
                            }}
                        >
                            <i className="fas">&#xf100;</i>
                        </div>
                    )}
                    {pageNumbers?.map((pageNumber) => {
                        return (
                            <div
                                key={pageNumber}
                                className="page-button"
                                onClick={() => {
                                    setPageIndex(pageNumber);
                                }}
                                style={
                                    pageNumber === pageIndex
                                        ? {
                                              color: "black",
                                              fontWeight: "bold",
                                          }
                                        : {
                                              color: "white",
                                          }
                                }
                            >
                                {pageNumber}
                            </div>
                        );
                    })}
                    {totalPages > 3 && (
                        <div
                            className="page-button"
                            onClick={() => {
                                setPageIndex(totalPages);
                            }}
                        >
                            <i className="fas">&#xf101;</i>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileManipulation;
