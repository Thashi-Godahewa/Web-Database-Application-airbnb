var express = require('express');
var http = require('http');
var path = require("path");
var bodyParser = require('body-parser');
var app = express();
var server = http.createServer(app);

const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://s4143272:admin2015@dba-cluster.zeijt4l.mongodb.net/?appName=DBA-Cluster";
const client = new MongoClient(uri);

async function getListingsCollection() {
	await client.connect();
	const database = client.db('sample_airbnb');
	return database.collection('listingsAndReviews');
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname,'./public')));

app.get('/', function(req,res){
res.sendFile(path.join(__dirname,'./public/home.html'));
});

app.get('/listings', async function(req, res) {
	try {
		const limit = Math.min(Number(req.query.limit) || 6, 20);
		const query = {};

		if (req.query.location) {
			query['address.market'] = req.query.location;
		}

		if (req.query.property_type) {
			query.property_type = req.query.property_type;
		}

		if (req.query.bedrooms) {
			query.bedrooms = Number(req.query.bedrooms);
		}

		const pipeline = [];

		if (Object.keys(query).length > 0) {
			pipeline.push({ $match: query });
		}

		pipeline.push({ $sample: { size: limit } });
		pipeline.push({
			$project: {
				_id: 1,
				name: 1,
				summary: 1,
				property_type: 1,
				bedrooms: 1,
				address: 1,
				price: 1,
				review_scores: 1,
			},
		});

		const listings = await (await getListingsCollection())
			.aggregate(pipeline)
			.toArray();

		res.status(200).json(listings);
	} catch (error) {
		console.error('Failed to retrieve listings:', error.message);
		res.status(500).json({ error: 'Failed to retrieve listings.' });
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