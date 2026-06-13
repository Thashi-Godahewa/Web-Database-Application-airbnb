var express = require('express');
var http = require('http');
var path = require("path");
var bodyParser = require('body-parser');
var app = express();
var server = http.createServer(app);

const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://s4143272:admin2015@dba-cluster.zeijt4l.mongodb.net/?appName=DBA-Cluster";
const client = new MongoClient(uri);

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getListingsCollection() {
	await client.connect();
	const database = client.db('sample_airbnb');
	return database.collection('listingsAndReviews');
}

async function getBookingsCollection() {
	await client.connect();
	const database = client.db('sample_airbnb');
	return database.collection('bookings');
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname,'./public')));

app.get('/', function(req,res){
res.sendFile(path.join(__dirname,'./public/home.html'));
});

app.get('/booking.html', function(req, res) {
	res.redirect(302, '/bookings.html');
});

app.get('/listings', async function(req, res) {
	try {
		const limit = Math.min(Number(req.query.limit) || 6, 20);
		const query = {};

		if (req.query.location) {
			const safeLocation = escapeRegex(req.query.location.trim());
			query['address.market'] = { $regex: `^${safeLocation}$`, $options: 'i' };
		}

		if (req.query.property_type) {
			query.property_type = req.query.property_type;
		}

		if (req.query.bedrooms) {
			const parsedBedrooms = Number(req.query.bedrooms);
			if (!Number.isNaN(parsedBedrooms)) {
				query.bedrooms = parsedBedrooms;
			}
		}

		const projection = {
			_id: 1,
			name: 1,
			summary: 1,
			property_type: 1,
			bedrooms: 1,
			address: 1,
			price: 1,
			review_scores: 1,
		};

		const listingsCollection = await getListingsCollection();
		let listings = [];

		if (Object.keys(query).length === 0) {
			listings = await listingsCollection
				.aggregate([
					{ $sample: { size: limit } },
					{ $project: projection },
				])
				.toArray();
		} else {
			listings = await listingsCollection
				.find(query)
				.project(projection)
				.toArray();
		}

		res.status(200).json(listings);
	} catch (error) {
		console.error('Failed to retrieve listings:', error.message);
		res.status(500).json({ error: 'Failed to retrieve listings.' });
	}
});

app.get('/listing/:listingId', async function(req, res) {
	try {
		const listingId = req.params.listingId;
		const listing = await (await getListingsCollection()).findOne(
			{ _id: listingId },
			{
				projection: {
					_id: 1,
					name: 1,
					property_type: 1,
					bedrooms: 1,
					price: 1,
					address: 1,
				},
			}
		);

		if (!listing) {
			res.status(404).json({ error: 'Listing not found.' });
			return;
		}

		res.status(200).json(listing);
	} catch (error) {
		console.error('Failed to retrieve listing:', error.message);
		res.status(500).json({ error: 'Failed to retrieve listing.' });
	}
});

app.post('/bookings', async function(req, res) {
	try {
		const {
			listing_id,
			check_in,
			check_out,
			customer_name,
			email,
			mobile,
			postal_address,
			residential_address,
		} = req.body;

		if (!listing_id || !check_in || !check_out || !customer_name || !email || !mobile) {
			res.status(400).json({ error: 'Missing required booking fields.' });
			return;
		}

		const arrivalDate = new Date(check_in);
		const departureDate = new Date(check_out);

		if (Number.isNaN(arrivalDate.getTime()) || Number.isNaN(departureDate.getTime()) || arrivalDate >= departureDate) {
			res.status(400).json({ error: 'Invalid booking date range.' });
			return;
		}

		await (await getBookingsCollection()).insertOne({
			listingID: listing_id,
			arrivalDate: arrivalDate,
			departureDate: departureDate,
			customerName: customer_name.trim(),
			email: email.trim(),
			mobile: mobile.trim(),
			postalAddress: (postal_address || '').trim(),
			residentialAddress: (residential_address || '').trim(),
			createdAt: new Date(),
		});

		res.redirect(302, '/confirmation.html?status=success');
	} catch (error) {
		console.error('Failed to create booking:', error.message);
		res.redirect(302, '/confirmation.html?status=failed');
	}
});

server.listen(3000,function(){
console.log("Server listening on port: 3000");
});

//To handle form actions (after submitting the form)
app.post('/item', function(req,res){
console.log([req.body.id, req.body.thing]);
const text =`
<ol>
<li>${req.body.id}</li>
<li>${req.body.thing}</li>
</ol>
`;
res.statusCode = 200;
res.setHeader('Content-Type', 'text/html');
res.end(text);
});

process.on('SIGINT', async function() {
	try {
		await client.close();
	} finally {
		process.exit(0);
	}
});